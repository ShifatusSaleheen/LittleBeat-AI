# CSE 499B — ECG Analysis Webapp

A 12-lead ECG arrhythmia classifier (9-class ensemble over `ECGFounder` embeddings)
with a React dashboard: waveform strip, 3D anatomical heart with arrhythmia
localization, per-lead occlusion evidence, and a patient chatbot.
Every prediction carries the reliability tier it earned under **patient-level**
(record-level) validation — this is a research prototype, not a diagnostic tool.

## Structure

```
backend/            FastAPI service — model loading, inference, chat
  app/
    core/config.py  Settings (paths to Results/, CORS, etc.) — override via .env
    ml/              net1d.py (encoder), classifier.py (CrossAttentionClassifier,
                     verified against reference/classifier.py — see below),
                     ensemble.py (EnsembleECG), constants.py (classes/anatomy)
    schemas/ecg.py   Pydantic models — the JSON contract with the frontend
    api/routes/      health, records, analyze (+ upload-analyze), chat
  tests/             shape-verification tests for the classifier
  scripts/generate_synthetic_record.py   fake demo record for local UI testing

frontend/            Vite + React + TypeScript + react-router-dom
  src/
    api/client.ts    fetch wrappers for the backend
    types/ecg.ts      TypeScript mirror of backend/app/schemas/ecg.py
    components/       LeadStrip, LeadEvidence, Chatbot, ReliabilityBadge,
                       Heart3D/HeartGLB.tsx (react-three-fiber GLB viewer),
                       AnalysisView (the shared results layout — waveform +
                       heart + finding + chatbot — used by both flows below)
    pages/
      Home/            landing page: upload vs. pretrained dataset
      Dashboard/        pretrained-dataset flow (record picker + AnalysisView)
      Upload/            upload-your-own flow (.hea+.dat -> AnalysisView)

Results/             Your existing trained models, checkpoints, and data —
                     untouched, referenced by path from backend/.env
Raw dataset/         The real Leipzig Heart Center PhysioNet database (39
                     records) — auto-detected as the default record source,
                     see below
reference/           The original single-file prototypes (ecg_dashboard.jsx,
                     ecg_inference_ensemble.py, heart_glb_viewer.html,
                     realistic_human_heart.glb, classifier.py) this project
                     was built from
```

## Running it locally

```bash
# backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
//python -m uvicorn app.main:app --reload --port 8000

# frontend (separate terminal)
cd frontend
npm install
npm run dev   # http://localhost:5173, proxies /api -> localhost:8000
```

Or `docker compose up --build` from the repo root.

## Real data is wired up

`Results/leipzig_raw/`'s 20 `.hea` files (no `.dat`) turned out to be headers
extracted from the full **Leipzig Heart Center ECG Database** (PhysioNet,
39 records: children x001–x0029, adults x100–x109), which now lives at
`Raw dataset/leipzig-heart-center-.../` — same signals, just renamed
(`x0010` → `x010`) when the headers were copied out.
`backend/app/core/config.py` auto-detects this folder and points
`ECG_RAW_RECORDS_DIR` at it by default (falls back to `Results/leipzig_raw/`
if it's absent) — no `.env` needed. `/api/records` now lists all 39 real
records, and `/api/analyze/<id>` runs real inference on real signals.

One fix was needed to get there: `xqrs_detect` (the R-peak detector) silently
returns **zero peaks** on a large fraction of these records (x0010, x0015,
x100, x108, ...) — its learning phase fails quietly, no exception, so the
model never even got to look at the beats. `analyse_record()` now falls back
to `gqrs_detect` when `xqrs_detect` finds nothing; verified this catches
every record checked so far. Confirmed end-to-end: `x0010` → "Junctional",
100% confidence, correct AV-junction marker on the 3D heart, rhythm
breakdown consistent with a manual pass using the dataset's own expert
`.atr` beat annotations.

`backend/scripts/generate_synthetic_record.py` still exists as a fake
fallback if you ever need to test without the real dataset mounted.

## Fixed: the dashboard hanging on "Analysing record..."

`analyse_record()` ran R-peak detection (`xqrs_detect`/`gqrs_detect`, both
largely pure Python) over the *entire* loaded signal before ever truncating
to `max_beats`. Most records are a few minutes long and this was instant,
but `x001` is a ~145-minute, 8.5M-sample recording — peak detection alone
took minutes, and because pure-Python loops don't release the GIL, it
stalled every other request on the process too (the dashboard defaults to
the alphabetically-first record, which is `x001`, so this hit on first
load). Fixed by adding `max_analysis_seconds=300` (5 min) to
`analyse_record()`, truncating the signal *before* peak detection instead
of after. Same fix incidentally resolved the earlier "heart rate reads
`null` on long records" issue too, since evenly-subsampled beats across a
5-minute window stay close enough together for the RR-interval calc to
survive its 0.25–3.0s filter (they didn't, across 145 minutes). Verified:
`x001` now analyses in ~11s (was: hung indefinitely), `x108`'s heart rate
now reads 39.3 bpm (was: `null`).

## Offline chatbot (Ollama)

The "Explain to patient" chatbot used to be a fixed set of keyword-matched
canned answers (`_rule_based_answer` in `backend/app/api/routes/chat.py`) —
anything outside ~6 recognized patterns got a generic "I'm not sure."
`/api/chat` now calls a **local, offline LLM via [Ollama](https://ollama.com)**
first, using the grounded system prompt from `ml/ensemble.build_chatbot_context()`
(finding, confidence, reliability tier, anatomical caveats, and rules like
"never diagnose" / "escalate on emergency symptoms"), and only falls back to
the old rule-based answers if Ollama isn't reachable — so the app still works
with zero LLM installed, just less conversationally.

Setup (already done on this machine): installed via `winget install Ollama.Ollama`,
pulled `llama3.2:3b` (~2GB, good balance of quality/speed on CPU — first
call after Ollama's idle-unload takes ~30-60s to reload the model, warm
calls run under a second). Configurable via `ECG_OLLAMA_HOST` /
`ECG_OLLAMA_MODEL` / `ECG_OLLAMA_TIMEOUT_S` in `backend/.env` if you want a
different model or a remote Ollama instance. Verified end-to-end (via curl
and the real browser chat UI): open-ended questions like "What is RBBB and
is it dangerous?" get genuine, medically accurate, appropriately-cautious
answers instead of a canned fallback.

## Upload-your-own flow

The homepage (`/`) offers two entry points: `/dashboard` (the pretrained
39-record dataset, as above) and `/upload` — analyse your own WFDB record
against the live model.

- **Backend**: `POST /api/upload-analyze` (multipart, fields `hea_file` +
  `dat_file`) saves both under their original filenames into a temp
  directory and runs them through the exact same `EnsembleECG.analyse_record()`
  used by the dataset flow — same `AnalysisResult` response, no separate
  code path to keep in sync. Both files are required: a `.hea` alone has no
  signal, a `.dat` alone has no gain/channel metadata to decode it with.
  Filenames are preserved as-is (not renamed) because the `.hea`'s own text
  declares its `.dat`'s filename per the WFDB spec — renaming would silently
  break the reference. 100MB/file cap; temp dir is cleaned up after the
  request either way.
- **Frontend**: `UploadPage` accepts the pair via click-to-browse or
  drag-and-drop, auto-sorts them by extension, and renders the identical
  `AnalysisView` component the dataset dashboard uses once analysis
  completes — same 3D heart, same chatbot, same everything.
- Verified end-to-end (including through the browser's real file input) with
  `Results/synthetic_demo/synth001.{hea,dat}`: upload → "Paced" at 77%
  confidence, correct RV-apex marker on the heart, matches the result from
  analysing the same record via the dataset path exactly.

## Housekeeping

- `results.zip` (1.1 GB) at the project root and
  `Raw dataset/leipzig-heart-center-..._2.zip` (1.3 GB) are redundant
  compressed copies of folders that are already extracted alongside them —
  safe to delete once you've confirmed you don't need them, just didn't want
  to do that without asking.
- `reference/realistic_human_heart.glb` is duplicated at
  `frontend/public/models/realistic_human_heart.glb` (that's the one the
  webapp actually serves) — the copy under `reference/` is just the original
  prototype's asset, kept for context.
- `backend/app/ml/classifier.py` was originally reconstructed from checkpoint
  tensor shapes alone (the training notebook wasn't in the initial export).
  The real source has since been found and pasted into
  `reference/classifier.py` — it matches the reconstruction exactly
  (`num_heads=8`, the `norm(x + attn_out)` residual, same MLP head), so
  `classifier.py` was updated to mirror it verbatim and the earlier "unverified
  architecture" caveat no longer applies.




claude --resume 98b57365-0b17-4cb8-8677-8fa49a35fb74
