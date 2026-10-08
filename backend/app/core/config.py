"""Central settings — every filesystem path the ML pipeline needs lives here
so it's never hardcoded inside app/ml/*. Override any of these with a .env
file (see .env.example) instead of editing code."""

import os
from functools import lru_cache
from pydantic_settings import BaseSettings

# Project root = backend/../  (the "499b front end" folder), so Results/
# stays exactly where it already is instead of being duplicated.
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

# The full PhysioNet source dataset (39 records: x001-x009, x0010-x0029,
# x100+), which is what Results/leipzig_raw/'s 20 headers were extracted
# from — same signals, just renamed (x0010 -> x010) when copied in. Point
# raw_records_dir here by default so /api/records sees all 39 real records
# instead of the 20 header-only stubs.
_RAW_DATASET_DIR = os.path.join(
    PROJECT_ROOT, "Raw dataset",
    "leipzig-heart-center-ecg-database-arrhythmias-in-children-and-patients-"
    "with-congenital-heart-disease-1.0.0",
)


class Settings(BaseSettings):
    results_dir: str = os.path.join(PROJECT_ROOT, "Results")

    encoder_path: str = ""
    grouped_dir: str = ""
    raw_records_dir: str = ""

    cors_origins: list[str] = ["http://localhost:5173"]

    max_beats_per_record: int = 200

    # Local, offline LLM for the patient chatbot — Ollama running on the
    # same machine. If it's unreachable, chat falls back to the rule-based
    # answers rather than failing the request (see api/routes/chat.py).
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"
    ollama_timeout_s: float = 60.0

    class Config:
        env_prefix = "ECG_"
        env_file = ".env"

    def model_post_init(self, __context) -> None:
        if not self.encoder_path:
            self.encoder_path = os.path.join(
                self.results_dir, "ecgfounder_checkpoint", "12_lead_ECGFounder.pth"
            )
        if not self.grouped_dir:
            self.grouped_dir = os.path.join(self.results_dir, "results_framework2_grouped")
        if not self.raw_records_dir:
            self.raw_records_dir = (
                _RAW_DATASET_DIR if os.path.isdir(_RAW_DATASET_DIR)
                else os.path.join(self.results_dir, "leipzig_raw")
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()
