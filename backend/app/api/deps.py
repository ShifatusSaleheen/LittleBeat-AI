"""Shared FastAPI dependencies. get_engine() is a singleton — the ensemble
loads 1 encoder + 5 classifier folds onto the device once, not per request."""

from functools import lru_cache

from ..core.config import get_settings
from ..ml.ensemble import EnsembleECG


@lru_cache
def get_engine() -> EnsembleECG:
    settings = get_settings()
    return EnsembleECG(
        encoder_path=settings.encoder_path,
        grouped_dir=settings.grouped_dir,
    )
