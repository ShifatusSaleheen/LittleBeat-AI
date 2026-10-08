// Mirrors backend/app/schemas/ecg.py — keep both in sync by hand for now;
// consider generating this from the FastAPI OpenAPI schema later.

export type ReliabilityTier = 'reliable' | 'marginal' | 'low_confidence';

export interface Prediction {
  class: string;
  confidence: number;
  reliability_tier: ReliabilityTier;
  record_level_f1: number;
  is_reliable: boolean;
}

export interface RhythmSummary {
  dominant_class: string;
  class_counts: Record<string, number>;
  class_fractions: Record<string, number>;
}

export interface LocalizationOrigin {
  site_id: string;
  label: string;
}

export interface Localization {
  class: string;
  site_id: string | null;
  label: string;
  mechanism: string;
  render: string;
  loc_tier: string;
  caveat: string | null;
  renderable: boolean;
  // Set only for classes with several possible-but-mutually-exclusive
  // origins (e.g. "Other", which merged LBBB/AVB1/SVT during training).
  origins?: LocalizationOrigin[] | null;
}

export interface LeadEvidenceData {
  method: string;
  note: string;
  values: Record<string, number>;
  top_lead: string;
}

export interface Waveform {
  sampling_rate_hz: number;
  duration_s: number;
  leads: string[];
  r_peaks_sample: number[];
  r_peaks_downsample_factor: number;
  signal: number[][];
}

export interface AnalysisResult {
  record: string;
  sampling_rate_hz: number;
  n_beats_analysed: number;
  heart_rate_bpm: number | null;
  ensemble_folds: number;
  prediction: Prediction;
  rhythm_summary: RhythmSummary;
  localization: Localization;
  lead_evidence: LeadEvidenceData;
  waveform: Waveform;
  disclaimer: string;
}
