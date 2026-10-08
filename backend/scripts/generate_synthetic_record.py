"""
Generates a synthetic 12-lead WFDB record for local dev/demo use.

Results/leipzig_raw/ only ships .hea header files — the real .dat signal
files were never included in this project export (see task #8 / README).
Until those are located, there is nothing real to point the dashboard at.
This script writes a FAKE but structurally valid record (regular QRS-like
beats a real xqrs_detect can find) so the full pipeline — R-peak detection,
the 9-class ensemble, occlusion evidence, the 3D heart, the dashboard —
can be exercised end-to-end. It is NOT clinical data. Do not mix its output
into leipzig_raw/; keep it under a clearly-named synthetic/ directory.

Usage:
    python scripts/generate_synthetic_record.py [output_dir] [record_name]
"""

import os
import sys

import numpy as np
import wfdb

LEAD_NAMES = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF',
              'V1', 'V2', 'V3', 'V4', 'V5', 'V6']
FS = 500
DURATION_S = 12
HR_BPM = 76


def make_signal(seed=0):
    rng = np.random.default_rng(seed)
    n = FS * DURATION_S
    mean_rr = 60.0 / HR_BPM
    beat_times = []
    t = 0.4
    while t < DURATION_S - 0.4:
        beat_times.append(t)
        t += mean_rr * (0.94 + 0.12 * rng.random())

    sig = np.zeros((12, n), dtype=np.float64)
    for li in range(12):
        kind = 'limb' if li < 3 else 'aug' if li < 6 else 'prec'
        amp = 1.0 if kind == 'limb' else 0.6 if kind == 'aug' else 1.2
        out = np.zeros(n)
        for bt in beat_times:
            c0 = int(round(bt * FS))
            for k in range(-int(0.25 * FS), int(0.45 * FS)):
                idx = c0 + k
                if idx < 0 or idx >= n:
                    continue
                tt = k / FS
                v = 0.0
                if -0.16 < tt < -0.08:
                    v += 0.12 * np.sin((tt + 0.16) / 0.08 * np.pi)
                if -0.05 < tt < 0.05:
                    q = (tt + 0.05) / 0.10
                    v += 1.0 * np.sin(q * np.pi)
                if 0.14 < tt < 0.34:
                    v += 0.22 * np.sin((tt - 0.14) / 0.20 * np.pi)
                out[idx] += v
        out = out * amp + rng.normal(0, 0.03, n)
        out += 0.04 * np.sin(np.arange(n) / n * np.pi * 2.5 + li)
        sig[li] = out * 1.0  # millivolts

    return sig.T  # (n_samples, 12) — what wfdb.wrsamp expects


def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), '..', '..', 'Results', 'synthetic_demo')
    record_name = sys.argv[2] if len(sys.argv) > 2 else 'synth001'
    os.makedirs(out_dir, exist_ok=True)

    p_signal = make_signal()
    wfdb.wrsamp(
        record_name,
        fs=FS,
        units=['mV'] * 12,
        sig_name=LEAD_NAMES,
        p_signal=p_signal,
        fmt=['16'] * 12,
        write_dir=out_dir,
    )
    print(f"Wrote synthetic record '{record_name}' to {out_dir}")


if __name__ == '__main__':
    main()
