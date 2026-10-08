"""Shared constants for the 9-class grouped ensemble — class list, per-class
record-level F1 (from patient-level validation), reliability tiers, and the
class -> anatomy mapping used for 3D localization. Split out of ensemble.py
so routes/schemas can import them without pulling in torch/wfdb."""

TARGET_FS = 500
WINDOW_SEC = 10
WINDOW_TARGET = WINDOW_SEC * TARGET_FS
N_LEADS = 12
EMBEDDING_DIM = 1024

LEAD_NAMES = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF',
              'V1', 'V2', 'V3', 'V4', 'V5', 'V6']

# 9-class scheme used by the GROUPED run (SVT merged into Other).
CLASS_NAMES = ['AFib', 'Fusion', 'Junctional', 'Other',
               'PAC', 'PVC', 'Paced', 'RBBB', 'VT']
NUM_CLASSES = len(CLASS_NAMES)

# Record-level F1 per class — travels to the UI so the badge is data-driven.
RECORD_LEVEL_F1 = {
    'RBBB': 0.8272, 'Junctional': 0.8107, 'Paced': 0.6291,
    'AFib': 0.5713, 'VT': 0.4114, 'PVC': 0.3460,
    'PAC': 0.1743, 'Other': 0.0726, 'Fusion': 0.0232,
}


def _tier(f1):
    if f1 >= 0.60:
        return 'reliable'
    if f1 >= 0.40:
        return 'marginal'
    return 'low_confidence'


RELIABILITY_TIER = {c: _tier(f1) for c, f1 in RECORD_LEVEL_F1.items()}

# CLASS -> ANATOMY (tiers justified by the attribution study)
ANATOMY = {
    'AFib': dict(site_id='la_pv_ostia',
        label='Left atrium — pulmonary vein ostia',
        mechanism='Chaotic re-entrant wavelets', render='scatter',
        loc_tier='marginal',
        caveat='76% of training AFib came from one patient; the V1 '
               'dependence may be patient-specific.'),
    'PAC': dict(site_id='atrial_focus',
        label='Atrial ectopic focus',
        mechanism='Premature focal discharge above the AV node',
        render='point', loc_tier='low',
        caveat='72% single-patient; record-level F1 0.17. Location shown '
               'for illustration only.'),
    'Paced': dict(site_id='rv_apex',
        label='Pacemaker lead — right ventricular apex',
        mechanism='Artificial stimulus', render='lead',
        loc_tier='supported',
        caveat='RV apex is the standard site; other lead positions exist.'),
    'RBBB': dict(site_id='right_bundle',
        label='Right bundle branch',
        mechanism='Conduction block', render='branch_right',
        loc_tier='class_based',
        caveat=None),
    'Junctional': dict(site_id='av_junction',
        label='AV junction',
        mechanism='Escape pacemaker or nodal re-entry', render='point',
        loc_tier='class_based',
        caveat='Merges AVNRT (AV node), AVRT (accessory pathway, OUTSIDE '
               'the node) and PJC. Denotes a region, not a precise point.'),
    'PVC': dict(site_id='ventricular_myocardium',
        label='Ventricular myocardium — chamber not determined',
        mechanism='Premature focal discharge below the AV node',
        render='region_both_ventricles', loc_tier='chamber_unresolved',
        caveat='RV vs LV origin CANNOT be determined. Attribution pointed '
               'at lead II, not the precordial leads. Render both ventricles.'),
    'VT': dict(site_id='ventricular_myocardium',
        label='Ventricular myocardium — chamber not determined',
        mechanism='Sustained re-entry, often scar-related',
        render='region_both_ventricles', loc_tier='chamber_unresolved',
        caveat='Same limitation as PVC. VT is life-threatening — any '
               'positive prediction warrants immediate clinical review.'),
    'Fusion': dict(site_id=None,
        label='Fusion beat — two simultaneous origins',
        mechanism='Sinus and ventricular activation collide',
        render='multi_simultaneous', loc_tier='multi_simultaneous',
        caveat="A fusion beat happens when a normal sinus impulse (from "
               "the SA node) and a premature ventricular impulse activate "
               "the heart at nearly the same moment and blend into one "
               "beat. Both sites below are real and happen together — "
               "unlike the 'Other' category, this is NOT a case of one of "
               "several; it's genuinely both at once. Record-level F1 "
               "0.02 — treat the finding itself as unreliable.",
        origins=[
            {'site_id': 'sa_node', 'label': 'SA node (sinus beat)'},
            {'site_id': 'ventricular_myocardium', 'label': 'Ventricular ectopic focus'},
        ]),
    'Other': dict(site_id=None,
        label='Unclassified / merged category',
        mechanism='One of three merged rhythms: LBBB, 1st-degree AV block, or SVT',
        render='multi_probable', loc_tier='multi_probable',
        caveat="This class absorbed three different conditions during "
               "training — LBBB, 1st-degree AV block (AVB1), and SVT. The "
               "model cannot tell which one a given beat actually is. The "
               "three sites below are the POSSIBLE origins: it's one of "
               "these, not all three at once.",
        origins=[
            {'site_id': 'left_bundle', 'label': 'Left bundle branch (LBBB)'},
            {'site_id': 'av_node', 'label': 'AV node — 1st-degree block (AVB1)'},
            {'site_id': 'atrial_focus', 'label': 'Atrial focus (SVT)'},
        ]),
}

DISCLAIMER = ('Research prototype for CSE 499B. Not a medical device. Not '
              'validated for clinical use. Any concerning finding requires '
              'review by a qualified cardiologist.')
