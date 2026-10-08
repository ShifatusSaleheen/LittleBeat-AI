"""Pydantic models mirroring EnsembleECG.analyse_record()'s JSON contract
(app/ml/ensemble.py) — gives the OpenAPI docs and the generated frontend
types a single source of truth instead of an untyped dict."""

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class Prediction(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    class_: str = Field(alias="class")
    confidence: float
    reliability_tier: str
    record_level_f1: float
    is_reliable: bool


class RhythmSummary(BaseModel):
    dominant_class: str
    class_counts: dict[str, int]
    class_fractions: dict[str, float]


class LocalizationOrigin(BaseModel):
    site_id: str
    label: str


class Localization(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    class_: str = Field(alias="class")
    site_id: Optional[str]
    label: str
    mechanism: str
    render: str
    loc_tier: str
    caveat: Optional[str]
    renderable: bool
    # Set only for classes with several possible-but-mutually-exclusive
    # origins (e.g. "Other", which merged LBBB/AVB1/SVT during training) —
    # the frontend renders one marker per entry with a caveat that it's one
    # of these, not all of them.
    origins: Optional[list[LocalizationOrigin]] = None


class LeadEvidence(BaseModel):
    method: str
    note: str
    values: dict[str, float]
    top_lead: str


class Waveform(BaseModel):
    sampling_rate_hz: float
    duration_s: float
    leads: list[str]
    r_peaks_sample: list[int]
    r_peaks_downsample_factor: int
    signal: list[list[float]]


class AnalysisResult(BaseModel):
    record: str
    sampling_rate_hz: float
    n_beats_analysed: int
    heart_rate_bpm: Optional[float]
    ensemble_folds: int
    prediction: Prediction
    rhythm_summary: RhythmSummary
    localization: Localization
    lead_evidence: LeadEvidence
    waveform: Waveform
    disclaimer: str


class ChatRequest(BaseModel):
    """Chat runs against an already-fetched AnalysisResult (the same object
    the /analyze endpoint returned) so a chat turn never re-runs inference."""
    result: AnalysisResult
    question: str
    # Whether "see a cardiologist" has already been said earlier in this
    # conversation (tracked client-side — see build_chatbot_context) so the
    # system prompt can stop repeating it after the first mention.
    hint_given: bool = False


class ChatResponse(BaseModel):
    answer: str


class ChatContextRequest(BaseModel):
    result: AnalysisResult
    hint_given: bool = False


class ChatContextResponse(BaseModel):
    system_prompt: str
