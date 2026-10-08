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


