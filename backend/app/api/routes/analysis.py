import os
import shutil
import tempfile
from functools import lru_cache

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ...core.config import get_settings
from ...ml.ensemble import EnsembleECG
from ...schemas.ecg import AnalysisResult
from ..deps import get_engine

router = APIRouter()

# WFDB .dat files for a few minutes of 12-lead + catheter channels run into
# the tens of MB — cap well above that, well below "someone's trying
# something".
MAX_UPLOAD_BYTES = 100 * 1024 * 1024


@lru_cache(maxsize=32)
def _cached_analyse(engine: EnsembleECG, record_path: str, max_beats: int) -> dict:
    return engine.analyse_record(record_path, max_beats=max_beats)


@router.get("/analyze/{record_id}", response_model=AnalysisResult)
def analyze(record_id: str, engine: EnsembleECG = Depends(get_engine)):
    settings = get_settings()
    record_path = os.path.join(settings.raw_records_dir, record_id)
    if not os.path.exists(record_path + ".hea"):
        raise HTTPException(status_code=404, detail=f"Record '{record_id}' not found")
    try:
        result = _cached_analyse(engine, record_path, settings.max_beats_per_record)
    except Exception as exc:  # model/signal errors surface as 500s, not crashes
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return result


async def _save_upload(upload: UploadFile, dest_path: str) -> None:
    size = 0
    with open(dest_path, "wb") as f:
        while chunk := await upload.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail=f"{upload.filename} exceeds the "
                           f"{MAX_UPLOAD_BYTES // (1024 * 1024)}MB upload limit",
                )
            f.write(chunk)


@router.post("/upload-analyze", response_model=AnalysisResult)
async def upload_analyze(
    hea_file: UploadFile = File(..., description="WFDB header (.hea)"),
    dat_file: UploadFile = File(..., description="WFDB signal data (.dat)"),
    engine: EnsembleECG = Depends(get_engine),
):
    """Analyse an uploaded WFDB record instead of one from the pretrained
    dataset. Both files are required — a .hea header alone has no signal to
    read, and a .dat alone has no gain/channel metadata to decode it with.
    The .hea's *own* text declares its .dat's filename (per the WFDB spec);
    we preserve both uploaded filenames as-is so that reference still
    resolves, rather than renaming and silently breaking mismatched pairs.
    """
    hea_name = os.path.basename(hea_file.filename or "")
    dat_name = os.path.basename(dat_file.filename or "")
    if not hea_name.lower().endswith(".hea"):
        raise HTTPException(status_code=400, detail="First file must be a WFDB .hea header")
    if not dat_name.lower().endswith(".dat"):
        raise HTTPException(status_code=400, detail="Second file must be a WFDB .dat signal file")

    settings = get_settings()
    tmp_dir = tempfile.mkdtemp(prefix="ecg_upload_")
    try:
        await _save_upload(hea_file, os.path.join(tmp_dir, hea_name))
        await _save_upload(dat_file, os.path.join(tmp_dir, dat_name))

        record_path = os.path.join(tmp_dir, hea_name[:-4])  # strip ".hea"
        try:
            result = engine.analyse_record(record_path, max_beats=settings.max_beats_per_record)
        except Exception as exc:
            raise HTTPException(
                status_code=422, detail=f"Could not analyse this recording: {exc}"
            ) from exc
        return result
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
