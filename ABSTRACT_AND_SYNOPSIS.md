*Note: written from the code, README, and `499a-both-frameworks.ipynb` in this repo. Check the numbers against your own final notebook run before submitting — re-verify anything you can't immediately trace back to a specific cell.*

# LittleBeat AI — 12-Lead ECG Arrhythmia Detection with Honest, Patient-Level Reliability

**CSE 499A/B Capstone Project**

---

## Abstract

LittleBeat AI is an end-to-end system for automated 12-lead ECG arrhythmia detection and explanation, developed as a two-phase capstone project using the PhysioNet Leipzig Heart Center ECG database. Phase one (CSE 499A) developed a two-framework classification pipeline: a binary 1D-CNN gate distinguishing normal from arrhythmic beats (115,949 beats), and a multi-class arrhythmia-type classifier trained via transfer learning on ECGFounder — a foundation model pre-trained on over 10.7 million clinical ECGs across 150 diagnostic labels — using an 8-head cross-attention classification head over frozen 1024-dimensional embeddings extracted from beat-centered 10-second context windows.

A central finding of this phase was methodological rather than architectural. Standard beat-level stratified k-fold cross-validation substantially overstated real-world performance, because beats drawn from the same patient recording leaked across the train/validation split (macro F1: 0.78). Re-evaluating the same classifier with record-grouped cross-validation (`StratifiedGroupKFold`, grouped by recording, so no single recording ever spans both sets) dropped the measured macro F1 to 0.39 — revealing which of the model's arrhythmia classes generalize to genuinely unseen patients (e.g. RBBB, F1 0.83) and which do not (e.g. Fusion, F1 0.02).

Rather than discard or average away this result, phase two (CSE 499B) built these record-level, per-class reliability scores directly into a deployed web application. A FastAPI backend serves a 5-fold ensemble of the record-validated classifier; a React/TypeScript frontend presents every prediction alongside a data-driven reliability badge (reliable / marginal / low-confidence), a 3D anatomical visualization of the rhythm's likely origin, per-lead evidence for the model's reasoning, and a bilingual (English/Bangla) LLM chatbot — grounded in the same caveats — that explains findings to patients in plain language without ever issuing a diagnosis. The result is a system that treats calibrated honesty about its own limitations as a core feature rather than an afterthought. LittleBeat AI is a research prototype and is explicitly not validated for clinical use.

---

## Synopsis

### 1. Introduction

Automated ECG interpretation is one of the most heavily benchmarked problems in clinical machine learning, yet reported model performance frequently fails to survive contact with real deployment. A large share of that gap traces back to how models are evaluated, not how they are trained: when a dataset consists of many labeled *beats* drawn from relatively few *patients* or *recordings*, a naive random or stratified split routinely places beats from the same recording on both sides of the train/validation boundary. The model then partly "recognizes" the patient rather than the arrhythmia, and the reported accuracy describes a task the deployed system will never actually face — a new recording from a patient it has never seen.

LittleBeat AI was built around treating this problem as the project's central design constraint, not a footnote. The system name reflects the project's two halves: a rigorously (re-)evaluated arrhythmia classifier, and a web application that never lets an optimistic number reach an end user without its honest counterpart attached.

### 2. Problem Statement

1. Multi-class arrhythmia classifiers trained on ECG datasets with few distinct patients/recordings are routinely evaluated with beat-level splits, producing performance figures that do not reflect generalization to new patients.
2. Even when a more rigorous evaluation is performed, that information is rarely surfaced to the end user of a deployed system — a clinician or patient sees a single confidence number with no indication of whether that class is one the model is actually good at.
3. ECG interpretation tools aimed at patients (rather than clinicians) need to communicate uncertainty and anatomical reasoning in accessible language, in more than one language, without overstepping into diagnosis.

### 3. Objectives

- Build a 12-lead ECG arrhythmia classifier using transfer learning from a large pre-trained ECG foundation model (ECGFounder), addressing class imbalance among arrhythmia subtypes.
- Quantify, empirically, the gap between beat-level and record-level (patient-generalization) evaluation for this task.
- Derive per-class reliability scores from the honest, record-level evaluation and use them as a first-class input to system design, not a post-hoc caveat.
- Deploy the classifier behind a full-stack web application that visualizes findings anatomically, explains the model's per-lead evidence, and communicates reliability and results to patients in plain, bilingual language via an LLM chatbot.

### 4. Dataset

The **Leipzig Heart Center ECG Database** (PhysioNet), 39 records spanning pediatric (x001–x0029) and adult (x100–x109) patients undergoing electrophysiology (EP) studies. Each record carries 19 channels; channels 12–18 are intracardiac electrograms from EP-study catheters (ablation catheter, right-ventricular apex catheter, coronary sinus bipolar pairs). These were **deliberately excluded** from training — no real surface-ECG deployment would ever have access to them, and because catheter position is often diagnostic of the arrhythmia's origin by construction, training on them would leak the label. Only the standard 12 surface leads (I, II, III, aVR, aVL, aVF, V1–V6) were used, matching what a real deployment would actually receive.

### 5. Methodology

**5.1 Framework 1 — Normal vs. Arrhythmia (binary gate).** A 1D-CNN trained on all 115,949 labeled beats to separate normal beats from any arrhythmic beat, using `WeightedRandomSampler` and class weighting to counter class imbalance, validated with 5-fold stratified cross-validation.

**5.2 Framework 2 — Arrhythmia type (multi-class).** The 64,985 beats flagged as arrhythmic by Framework 1 were classified into arrhythmia subtypes. Rather than train a CNN from scratch — which struggled on minority classes (macro precision 0.83) under severe class imbalance — each beat was represented as a 1024-dimensional embedding from **ECGFounder**, a foundation model pre-trained on 10,771,552 clinical ECGs across 150 diagnostic labels, extracted from a 10-second window centered on the beat's R-peak (ECGFounder's expected input format). An 8-head cross-attention classification head was then trained on top of these frozen embeddings — again with `WeightedRandomSampler` and class weighting — to predict one of the arrhythmia subtypes (AFib, Fusion, Junctional, Other, PAC, PVC, Paced, RBBB, SVT, VT).

**5.3 The evaluation pitfall, and fixing it.** Framework 2 was first validated with plain stratified k-fold cross-validation over individual beats, yielding a macro F1 of **0.78**. Because a single 39-record dataset means the same recording's beats can land in both the training and validation folds, this number conflates "recognizing an arrhythmia" with "recognizing a recording." Framework 2 was therefore re-evaluated using `StratifiedGroupKFold`, grouping every fold split by recording ID so that no recording ever spans the train/validation boundary. The honest, record-level macro F1 across 5 folds was **0.39 (± 0.10)** — roughly half the beat-level estimate, and the number that actually predicts performance on a new patient.

**5.4 Per-class reliability, and why one class was dropped.** The record-level evaluation was run per class, producing a reliability score for each arrhythmia type (see Results). SVT was excluded from the final deployed class list: under record-grouped folds, four of the five folds contained zero SVT examples, so no stable per-fold F1 could be computed for it — reporting a number here would have been fabricated precision. SVT (along with the merged-category classes LBBB and 1st-degree AV block) was folded into a single **"Other"** bucket in deployment, and the UI explicitly discloses this merge rather than presenting it as a clean class.

### 6. System Architecture — "LittleBeat AI" Web Application (CSE 499B)

- **Backend** (FastAPI, Python): loads the record-level-validated classifier as a **5-fold ensemble**, exposes `/api/records`, `/api/analyze/{id}`, `/api/upload-analyze` (users can upload their own `.hea`/`.dat` WFDB recording), and `/api/chat`.
- **Frontend** (React 19 + TypeScript + Vite): a 12-lead waveform viewer, a 3D anatomical heart (`react-three-fiber`) that localizes the predicted rhythm's likely anatomical origin, and a per-lead evidence panel showing which leads most influenced the prediction.
- **Reliability-aware UX**: every prediction is shown with a badge — **reliable** / **marginal** / **low-confidence** — driven directly by that class's record-level F1, plus a plain-language caveat when the class is a merged/ambiguous bucket. The interface is built so that a high-confidence *softmax score* on an unreliable class cannot masquerade as a trustworthy result.
- **Bilingual patient chatbot**: a local, offline LLM (Ollama, `llama3.2:3b`) explains the finding conversationally in English or Bangla, grounded in a system prompt built from the same finding, confidence, reliability tier, and anatomical caveats shown in the UI — instructed never to diagnose and to flag emergency symptoms for escalation. Falls back to deterministic rule-based answers if the local LLM is unavailable, so the app never depends on it being present.

### 7. Results Summary

| Metric | Beat-level (leaky) split | Record-level (honest) split |
|---|---|---|
| Framework 2 macro F1 | 0.78 | **0.39 (± 0.10)** |

| Arrhythmia class | Record-level F1 | Reliability tier |
|---|---|---|
| RBBB | 0.83 | Reliable |
| Junctional | 0.81 | Reliable |
| Paced | 0.63 | Reliable |
| AFib | 0.57 | Marginal |
| VT | 0.41 | Marginal |
| PVC | 0.35 | Marginal |
| PAC | 0.17 | Low confidence |
| Other (merged) | 0.07 | Low confidence |
| Fusion | 0.02 | Low confidence |

Framework 1 (Normal vs. Arrhythmia) reached ~0.99 macro F1 under beat-level cross-validation; this figure was **not** re-audited at the record level in the current notebook and should be read with the same caveat as Framework 2's pre-correction number.

### 8. Significance / Contribution

The primary contribution is not a novel architecture — it is demonstrating, with a paired before/after measurement on the same model and data, how large the beat-level/record-level evaluation gap can be for ECG arrhythmia classification (macro F1 0.78 → 0.39), and then building a deployed system whose entire user-facing design — badges, caveats, chatbot grounding — is derived from the honest number rather than the flattering one. This reframes "reliability" from a modeling afterthought into a first-class product requirement.

### 9. Limitations

- Only 39 recordings (38 usable under record-grouped CV) — record-level cross-validation folds are consequently high-variance (± 0.10 macro F1), and several classes (e.g. Fusion, Other) have too few per-record examples for the reliability estimate itself to be highly stable.
- Framework 1's binary gate was not re-validated at the record level; its 0.99 figure likely carries the same optimistic bias identified in Framework 2.
- The Leipzig cohort skews toward EP-study patients (i.e., patients already referred for a suspected arrhythmia), which may not represent the general population screened by a real deployment.
- This is a research prototype: not a diagnostic device, not FDA/CE cleared, and not validated for clinical decision-making.

### 10. Future Work

- Re-run Framework 1 under record-grouped cross-validation to obtain an honest binary-gate estimate.
- Validate against an external, independent ECG dataset to test generalization beyond the Leipzig cohort.
- Expand the training set for low-reliability classes (Fusion, Other, PAC) specifically, rather than uniformly, since their poor record-level F1 appears tied to per-record example scarcity.
- Extend the anatomical localization module beyond single-origin classes to better represent multi-focal or ambiguous rhythms.

### 11. Conclusion

LittleBeat AI shows that for real-world ECG deployment, *how* a model is validated matters as much as how it is trained — a naive evaluation protocol overstated this project's own arrhythmia classifier by nearly 2×. By measuring that gap directly and then designing the entire downstream application — reliability badges, anatomical caveats, and a grounded bilingual chatbot — around the honest, record-level numbers, the project delivers a system that is transparent about exactly what it does and does not know, rather than one that looks better on a slide than it performs on a new patient.
