"""
ecg_inference_ensemble — CSE 499B dashboard backend

Ensembles the 5 RECORD-LEVEL (grouped) classifier folds and returns the
JSON contract the React dashboard consumes.

Adapted from the original ecg_inference_ensemble.py: imports moved to the
app.ml package layout, classifier_class now defaults to CrossAttentionClassifier
(verified against the real training source, see classifier.py). One behavior
change from the original: R-peak detection tries xqrs_detect first, then
falls back to gqrs_detect if it finds zero peaks. On the real Leipzig
dataset (fs=977, includes paced pediatric/congenital-heart-disease patients)
xqrs_detect's learning phase silently fails on a large fraction of records
(x0010, x0015, x100, x108, ... — 0 peaks, not an exception) while gqrs_detect
finds a normal-looking beat count on the same signal every time it was
checked. Nothing else about analyse_record() or build_chatbot_context() changed.

  ── THE THREE GENERALISATION TIERS (from record-level validation) ─────
  record-level macro-F1 was 0.4010. Per class:
      RBBB       0.83  |  Junctional 0.81  |  Paced 0.63   -> GENERALISES
      AFib       0.57  |  VT         0.41                  -> MARGINAL
      PVC 0.35 | PAC 0.17 | Other 0.07 | Fusion 0.02        -> DOES NOT
  The dashboard shows every prediction, but classes that failed
  patient-level validation are badged 'low_confidence' and their 3D
  localization is suppressed or shown as unresolved.
"""

import os
import glob
import numpy as np
import torch
import wfdb
from wfdb.processing import xqrs_detect, gqrs_detect
from scipy.signal import resample_poly, butter, filtfilt, iirnotch

from .constants import (
    TARGET_FS, WINDOW_SEC, WINDOW_TARGET, N_LEADS, EMBEDDING_DIM,
    LEAD_NAMES, CLASS_NAMES, NUM_CLASSES, RECORD_LEVEL_F1,
    RELIABILITY_TIER, ANATOMY, DISCLAIMER,
)
from .classifier import CrossAttentionClassifier
from .net1d import Net1D


# ══════════════════════════════════════════════════════════════════════
#  SIGNAL PROCESSING — identical chain to training
# ══════════════════════════════════════════════════════════════════════
def _resample(sig, fs_in):
    if fs_in == TARGET_FS:
        return sig.astype(np.float32)
    from math import gcd
    g = gcd(int(round(fs_in)), TARGET_FS)
    return resample_poly(sig, TARGET_FS // g, int(round(fs_in)) // g,
                         axis=-1).astype(np.float32)

def _filter(sig, fs=TARGET_FS):
    sig = np.asarray(sig, dtype=np.float64)
    b, a = butter(3, 1.0/(fs/2), btype='high');  sig = filtfilt(b, a, sig, axis=-1)
    b, a = butter(3, 30.0/(fs/2), btype='low');  sig = filtfilt(b, a, sig, axis=-1)
    b, a = iirnotch(50.0, 30.0, fs);             sig = filtfilt(b, a, sig, axis=-1)
    return sig.astype(np.float32)

def _zscore(sig):
    m = np.mean(sig, axis=-1, keepdims=True)
    s = np.std(sig, axis=-1, keepdims=True)
    return ((sig - m) / (s + 1e-8)).astype(np.float32)

def preprocess(raw_window, fs_in):
    sig = _resample(raw_window, fs_in)
    n = sig.shape[-1]
    if n > WINDOW_TARGET:  sig = sig[..., :WINDOW_TARGET]
    elif n < WINDOW_TARGET: sig = np.pad(sig, ((0, 0), (0, WINDOW_TARGET - n)))
    return torch.from_numpy(np.ascontiguousarray(_zscore(_filter(sig)))).float()


# ══════════════════════════════════════════════════════════════════════
#  ENSEMBLE ENGINE
# ══════════════════════════════════════════════════════════════════════
class EnsembleECG:

    def __init__(self, encoder_path, grouped_dir, classifier_class=CrossAttentionClassifier,
                 net1d_module=None, device=None):
        self.device = device or torch.device(
            'cuda' if torch.cuda.is_available() else 'cpu')
        if net1d_module is None:
            net1d_module = Net1D

        # ── Encoder (shared across all folds) ─────────────────────────
        self.encoder = net1d_module(
            in_channels=N_LEADS, base_filters=64, ratio=1,
            filter_list=[64, 160, 160, 400, 400, 1024, 1024],
            m_blocks_list=[2, 2, 2, 3, 3, 4, 4],
            kernel_size=16, stride=2, groups_width=16,
            n_classes=1, use_bn=False, use_do=False,
            return_features=True, verbose=False)
        ck = torch.load(encoder_path, map_location='cpu', weights_only=False)
        sd = ck['state_dict']
        if all(k.startswith('module.') for k in sd):
            sd = {k[7:]: v for k, v in sd.items()}
        sd = {k: v for k, v in sd.items() if not k.startswith('dense.')}
        self.encoder.load_state_dict(sd, strict=False)
        self.encoder.to(self.device).eval()
        for p in self.encoder.parameters():
            p.requires_grad = False

        # ── All grouped-fold classifiers ──────────────────────────────
        paths = sorted(glob.glob(os.path.join(
            grouped_dir, 'best_model_*fold*.pt')))
        if not paths:
            raise FileNotFoundError(
                f"No grouped fold checkpoints in {grouped_dir}\n"
                f"Present: {sorted(os.listdir(grouped_dir)) if os.path.isdir(grouped_dir) else '(missing dir)'}")
        self.clfs = []
        for p in paths:
            clf = classifier_class(embed_dim=EMBEDDING_DIM,
                                   num_classes=NUM_CLASSES).to(self.device)
            state = torch.load(p, map_location=self.device)
            # guard: checkpoint must be 9-class, not the 10-class beat-level one
            head_w = [v for k, v in state.items() if k.endswith('classifier.3.weight')]
            if head_w and head_w[0].shape[0] != NUM_CLASSES:
                raise RuntimeError(
                    f"{os.path.basename(p)} has {head_w[0].shape[0]} output "
                    f"classes, expected {NUM_CLASSES}. This looks like a "
                    f"beat-level (10-class) checkpoint, not a grouped one.")
            clf.load_state_dict(state)
            clf.eval()
            for q in clf.parameters():
                q.requires_grad = False
            self.clfs.append(clf)
        print(f"Ensemble ready: {len(self.clfs)} folds, {NUM_CLASSES} classes, "
              f"device={self.device}")

    # ── ensemble forward: mean softmax over folds ─────────────────────
    @torch.no_grad()
    def _predict(self, x):
        _, feats = self.encoder(x)                    # (B, 1024)
        probs = torch.zeros(x.shape[0], NUM_CLASSES, device=self.device)
        for clf in self.clfs:
            probs += torch.softmax(clf(feats), dim=1)
        return (probs / len(self.clfs)).cpu().numpy()

    # ── record loading ────────────────────────────────────────────────
    def _load(self, record_path):
        hdr = wfdb.rdheader(record_path)
        names = [s.strip() for s in hdr.sig_name]
        missing = [nm for nm in LEAD_NAMES if nm not in names]
        if missing:
            raise ValueError(f"Not 12-lead. Missing {missing}. Has {names}")
        idxs = [names.index(nm) for nm in LEAD_NAMES]
        rec = wfdb.rdrecord(record_path, channels=idxs, return_res=32)
        ret = [s.strip() for s in rec.sig_name]
        reorder = [ret.index(nm) for nm in LEAD_NAMES]
        sig = np.nan_to_num(rec.p_signal[:, reorder].T, nan=0.0)
        return sig.astype(np.float32), float(rec.fs)

    def _win(self, sig, fs, r):
        half = int(round(WINDOW_SEC * fs / 2))
        s0, s1 = max(0, r - half), min(sig.shape[1], r + half)
        w = np.zeros((N_LEADS, 2 * half), dtype=np.float32)
        w[:, max(0, half - r): max(0, half - r) + (s1 - s0)] = sig[:, s0:s1]
        return w

    # ── per-lead evidence via occlusion (the method that survived) ────
    @torch.no_grad()
    def _lead_evidence(self, x, cls):
        batch = [x] + [x.clone() for _ in range(N_LEADS)]
        for k in range(N_LEADS):
            batch[k + 1][k] = 0.0
        p = self._predict(torch.stack(batch).to(self.device))[:, cls]
        drop = np.clip(p[0] - p[1:], 0, None)
        tot = drop.sum()
        drop = drop / tot if tot > 1e-12 else np.full(N_LEADS, 1 / N_LEADS)
        return {LEAD_NAMES[i]: float(drop[i]) for i in range(N_LEADS)}

    # ── main entry point ──────────────────────────────────────────────
    def analyse_record(self, record_path, max_beats=200,
                       waveform_seconds=10, max_analysis_seconds=300):
        sig, fs = self._load(record_path)
        # Some real recordings run for 100+ minutes (e.g. the Leipzig
        # dataset's x001 is ~145 min at fs=977 -> 8.5M samples). Peak
        # detection only needs to look at enough signal to find
        # max_beats beats — running xqrs/gqrs (largely pure-Python) over
        # an entire multi-hour array can take minutes and, since neither
        # releases the GIL, blocks every other request on the process
        # meanwhile. Truncate before detection, not after.
        max_samples = int(max_analysis_seconds * fs)
        if sig.shape[1] > max_samples:
            sig = sig[:, :max_samples]
        lead_ii = sig[LEAD_NAMES.index('II')].astype(np.float64)
        peaks = xqrs_detect(sig=lead_ii, fs=fs, verbose=False)
        peaks = np.asarray(peaks, dtype=np.int64)
        if len(peaks) == 0:
            # xqrs's learning phase can silently fail (0 peaks, no exception)
            # on some real recordings — gqrs uses a different heuristic and
            # has caught every case observed so far.
            peaks = np.asarray(gqrs_detect(sig=lead_ii, fs=fs), dtype=np.int64)
        if len(peaks) == 0:
            raise RuntimeError('No R-peaks detected (both xqrs and gqrs found none).')
        if len(peaks) > max_beats:
            peaks = peaks[np.linspace(0, len(peaks) - 1, max_beats).astype(int)]

        hr = None
        if len(peaks) > 1:
            rr = np.diff(peaks) / fs
            rr = rr[(rr > 0.25) & (rr < 3.0)]
            if len(rr):
                hr = float(60.0 / np.median(rr))

        # classify every detected beat
        beats, batch, meta = [], [], []
        for pk in peaks:
            batch.append(preprocess(self._win(sig, fs, pk), fs))
            meta.append(int(pk))
            if len(batch) >= 64:
                beats += self._flush(batch, meta, fs); batch, meta = [], []
        beats += self._flush(batch, meta, fs)

        # rhythm summary
        counts = {c: 0 for c in CLASS_NAMES}
        for b in beats:
            counts[b['class']] += 1
        n = len(beats)
        dominant = max(counts, key=counts.get)

        # representative beat = most confident beat of dominant class
        rep = max((b for b in beats if b['class'] == dominant),
                  key=lambda b: b['confidence'])
        rep_x = preprocess(self._win(sig, fs, rep['r_peak_sample']), fs)
        cls_idx = CLASS_NAMES.index(dominant)
        evidence = self._lead_evidence(rep_x.clone(), cls_idx)

        anat = ANATOMY[dominant]
        rel_tier = RELIABILITY_TIER[dominant]

        # 12-lead waveform strip for the left panel (downsampled for transport)
        n_wave = int(waveform_seconds * fs)
        strip = sig[:, :n_wave]
        ds = max(1, strip.shape[1] // 2500)            # cap ~2500 pts/lead
        strip_ds = strip[:, ::ds]
        # normalise each lead to [-1,1] for display only
        strip_norm = strip_ds - strip_ds.mean(axis=1, keepdims=True)
        peak = np.abs(strip_norm).max(axis=1, keepdims=True)
        strip_norm = strip_norm / np.where(peak > 1e-6, peak, 1)

        return {
            'record': os.path.basename(record_path),
            'sampling_rate_hz': fs,
            'n_beats_analysed': n,
            'heart_rate_bpm': round(hr, 1) if hr else None,
            'ensemble_folds': len(self.clfs),

            'prediction': {
                'class': dominant,
                'confidence': rep['confidence'],
                'reliability_tier': rel_tier,          # reliable|marginal|low_confidence
                'record_level_f1': RECORD_LEVEL_F1[dominant],
                'is_reliable': rel_tier == 'reliable',
            },

            'rhythm_summary': {
                'dominant_class': dominant,
                'class_counts': counts,
                'class_fractions': {k: round(v / n, 4)
                                    for k, v in counts.items()},
            },

            'localization': {
                'class': dominant,
                'site_id': anat['site_id'],
                'label': anat['label'],
                'mechanism': anat['mechanism'],
                'render': anat['render'],
                'loc_tier': anat['loc_tier'],
                'caveat': anat['caveat'],
                'renderable': anat['site_id'] is not None,
                'origins': anat.get('origins'),
            },

            'lead_evidence': {
                'method': 'occlusion (ensemble)',
                'note': 'Gradient attribution rejected (99% rank-1). '
                        'Occlusion is clinically valid for atrial/conduction '
                        'classes, not ventricular.',
                'values': evidence,
                'top_lead': max(evidence, key=evidence.get),
            },

            'waveform': {
                'sampling_rate_hz': fs / ds,
                'duration_s': round(strip_norm.shape[1] * ds / fs, 2),
                'leads': LEAD_NAMES,
                'r_peaks_sample': [int(p) for p in peaks
                                   if p < n_wave][:60],
                'r_peaks_downsample_factor': ds,
                'signal': strip_norm.round(3).tolist(),   # (12, ~2500)
            },

            'disclaimer': DISCLAIMER,
        }

    def _flush(self, batch, meta, fs):
        if not batch:
            return []
        probs = self._predict(torch.stack(batch).to(self.device))
        out = []
        for i, pk in enumerate(meta):
            k = int(probs[i].argmax())
            out.append({
                'r_peak_sample': pk,
                'time_s': round(pk / fs, 3),
                'class': CLASS_NAMES[k],
                'confidence': round(float(probs[i, k]), 4),
                'reliability_tier': RELIABILITY_TIER[CLASS_NAMES[k]],
            })
        return out


def build_chatbot_context(result, hint_given=False):
    """Grounded system prompt. Injects the reliability tier so the LLM
    cannot present a low-confidence class as a confident finding.

    hint_given: whether "see a cardiologist" has already been said earlier
    in this conversation (tracked client-side — each /api/chat call is
    otherwise stateless, no prior turns are sent to the model). Keeps the
    generic cardiologist nudge to once per conversation instead of on every
    reply; the per-finding reliability caveat (rel_rule below) and the
    emergency-symptom rule stay unconditional regardless, since those are
    safety-relevant to the specific message, not conversational filler."""
    loc = result['localization']
    pred = result['prediction']
    ev = result['lead_evidence']
    top3 = sorted(ev['values'].items(), key=lambda kv: -kv[1])[:3]
    top3s = ', '.join(f'{k} ({v*100:.0f}%)' for k, v in top3)

    rel_rule = {
        'reliable': 'This class generalised across patients (record-level '
                    'F1 >= 0.60). You may describe the finding normally.',
        'marginal': 'This class only partially generalised (F1 0.40-0.60). '
                    'State that the finding is uncertain and needs '
                    'confirmation.',
        # No ALL-CAPS flag words here (e.g. the old "CRITICAL:" prefix) — a
        # small local model echoed one back as if it were a formal
        # classification label ("this belongs to the 'CRITICAL' category"),
        # inventing a tier that doesn't exist in our system. State the same
        # urgency in plain sentence case instead.
        'low_confidence': 'Important: this class did not generalise across '
                          'patients (record-level F1 < 0.40). You must tell '
                          'the user this prediction is unreliable and should '
                          'not be acted on without a cardiologist.',
    }[pred['reliability_tier']]

    loc_rule = {
        'chamber_unresolved': 'Do NOT state which ventricle this came from — '
                              'the model cannot determine it.',
        'none': 'Do NOT give any anatomical location — none exists.',
        'low': 'The location shown is illustrative only; do not present it '
               'as a reliable finding.',
    }.get(loc['loc_tier'], 'You may state the anatomical site.')

    cardiologist_rule = (
        'Do not tell the user to see a cardiologist again — you already said '
        'that earlier in this conversation. Just answer the question '
        'directly. (Exception: rule 7 emergency symptoms always apply.)'
        if hint_given else
        'If it fits naturally, you may mention once that a cardiologist '
        'should confirm this interpretation — say it at most once, briefly, '
        'not as a prefix or suffix on every answer.'
    )

    return f"""You explain ECG analysis results to a patient in plain, direct language. Never diagnose.

RESULT
  Record          : {result['record']}
  Heart rate      : {result['heart_rate_bpm']} bpm
  Beats analysed  : {result['n_beats_analysed']}
  Dominant finding: {pred['class']} (confidence {pred['confidence']*100:.0f}%)
  Reliability     : {pred['reliability_tier']} (patient-level F1 {pred['record_level_f1']:.2f})
  Localization    : {loc['label']}
  Caveat          : {loc['caveat'] or 'none'}
  Influential leads (occlusion): {top3s}

RULES
  1. {rel_rule}
  2. {loc_rule}
  3. Reply in English.
  4. Never diagnose, never suggest treatment or medication.
  5. {cardiologist_rule}
  6. If asked something not covered here, say you don't know. Do not speculate.
  7. Chest pain / fainting / severe breathlessness -> tell them to seek
     emergency care immediately, then stop.
  8. Keep answers under 150 words.

{result['disclaimer']}"""
