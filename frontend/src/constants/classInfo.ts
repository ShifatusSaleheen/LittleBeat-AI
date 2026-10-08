// Plain-language "what is this" explanations for each of the 9 detected
// rhythm classes — shown under the Finding panel's class name so a patient
// doesn't have to already know cardiology terminology to understand their
// result. Kept on the frontend since it's static text, not per-request data.
export const CLASS_DESCRIPTIONS: Record<string, string> = {
  AFib:
    'Atrial fibrillation — the heart’s upper chambers (atria) quiver ' +
    'chaotically instead of beating in a steady, coordinated rhythm, which ' +
    'can make the pulse feel irregular.',
  Fusion:
    'A fusion beat — two electrical signals (one from the heart’s ' +
    'normal pacemaker, one from an abnormal focus) arrive at almost the ' +
    'same time and blend into a single unusual-looking beat.',
  Junctional:
    'Junctional rhythm — the electrical signal starts near the AV ' +
    'junction, the crossing point between the atria and ventricles, ' +
    'instead of the heart’s normal pacemaker (the SA node).',
  Other:
    'A merged category — this grouping combines several less common ' +
    'rhythm types that the model treats as one bucket rather than telling ' +
    'them apart.',
  PAC:
    'Premature atrial contraction — an early, extra heartbeat that starts ' +
    'in the atria before the next normal beat is due.',
  PVC:
    'Premature ventricular contraction — an early, extra heartbeat that ' +
    'starts in the ventricles (the heart’s lower, main pumping chambers).',
  Paced:
    'Paced rhythm — the heartbeat is being triggered by an implanted ' +
    'pacemaker device rather than the heart’s own electrical system.',
  RBBB:
    'Right bundle branch block — the electrical signal is delayed or ' +
    'blocked on its way through the right side of the heart’s ' +
    'conduction pathway.',
  VT:
    'Ventricular tachycardia — a fast, abnormal rhythm starting in the ' +
    'ventricles. It can be serious and usually needs prompt medical review.',
};
