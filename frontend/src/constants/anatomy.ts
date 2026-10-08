// Mirrors backend/app/ml/constants.py ANATOMY — kept on the frontend too
// because Heart3D needs 3D marker positions per site_id that have no
// reason to travel over the wire on every analyze response.

export interface AnatomySite {
  siteId: string;
  color: string;
  pos: [number, number, number];
  render: 'point' | 'scatter' | 'lead' | 'branch';
}

import { C } from '../theme/colors';

// Y sign convention (verified against the actual loaded GLB, not assumed):
// the great-vessel/atrial end renders at +Y, the apex at -Y. The values
// below are the reference prototype's originals with Y negated — a plain
// render showed its hand-picked coordinates had ventricles sitting above
// the atria, which is anatomically backwards for this mesh.
export const SITES: Record<string, AnatomySite> = {
  right_bundle: { siteId: 'right_bundle', color: C.rose, pos: [-0.28, -0.15, 0.16], render: 'branch' },
  // Left bundle branch — mirror of right_bundle across the septum (flip X).
  left_bundle: { siteId: 'left_bundle', color: C.rose, pos: [0.28, -0.15, 0.16], render: 'branch' },
  av_junction: { siteId: 'av_junction', color: C.signal, pos: [0.0, 0.10, 0.14], render: 'point' },
  // AV node is the core of the AV junction — same site, different name
  // (Junctional uses "av_junction" for the escape-pacemaker region;
  // "av_node" is used when talking specifically about 1st-degree block).
  av_node: { siteId: 'av_node', color: C.signal, pos: [0.0, 0.10, 0.14], render: 'point' },
  rv_apex: { siteId: 'rv_apex', color: '#b79be0', pos: [-0.34, -0.75, 0.10], render: 'lead' },
  la_pv_ostia: { siteId: 'la_pv_ostia', color: C.signal, pos: [0.44, 0.55, -0.10], render: 'scatter' },
  atrial_focus: { siteId: 'atrial_focus', color: C.signal, pos: [-0.30, 0.45, 0.18], render: 'point' },
  // SA node — high right atrium, near where the superior vena cava enters.
  // Offset from atrial_focus so the two don't visually overlap.
  sa_node: { siteId: 'sa_node', color: C.signal, pos: [-0.18, 0.58, 0.22], render: 'point' },
  ventricular_myocardium: { siteId: 'ventricular_myocardium', color: C.amber, pos: [0.25, -0.30, 0.02], render: 'point' },
};

// second point for the "both ventricles" (chamber-unresolved) render mode
export const VENTRICLE_SECONDARY: [number, number, number] = [-0.28, -0.28, 0.05];

export const LEADS = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
