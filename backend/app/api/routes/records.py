import glob
import os

from fastapi import APIRouter

from ...core.config import get_settings

router = APIRouter()


@router.get("/records")
def list_records():
    """Record ids available under ECG_RAW_RECORDS_DIR (WFDB .hea/.dat pairs)."""
    settings = get_settings()
    heas = sorted(glob.glob(os.path.join(settings.raw_records_dir, "*.hea")))
    return {"records": [os.path.splitext(os.path.basename(p))[0] for p in heas]}
