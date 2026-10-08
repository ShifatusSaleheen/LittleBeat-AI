"""
Confirms CrossAttentionClassifier (app/ml/classifier.py) loads every trained
fold checkpoint with strict=True. This module was originally reconstructed
from checkpoint tensor shapes alone (before the real source, extracted from
the training notebook, was found and pasted into reference/classifier.py) —
that guess turned out to match exactly (num_heads=8, the norm(x + attn_out)
residual, same MLP head), so this test now just guards against regressions.
"""
import glob
import os

import pytest
import torch

from app.ml.classifier import CrossAttentionClassifier

RESULTS_DIR = os.environ.get(
    "ECG_RESULTS_DIR",
    os.path.join(os.path.dirname(__file__), "..", "..", "Results"),
)

CHECKPOINT_DIRS = [
    (os.path.join(RESULTS_DIR, "results_framework2_grouped"), 9),
    (os.path.join(RESULTS_DIR, "results_framework2"), 10),
]


def _all_checkpoints():
    for d, n_classes in CHECKPOINT_DIRS:
        for path in sorted(glob.glob(os.path.join(d, "best_model_*fold*.pt"))):
            yield path, n_classes


@pytest.mark.parametrize("path,n_classes", list(_all_checkpoints()))
def test_checkpoint_loads_strict(path, n_classes):
    state = torch.load(path, map_location="cpu")
    if isinstance(state, dict) and "state_dict" in state:
        state = state["state_dict"]
    model = CrossAttentionClassifier(embed_dim=1024, num_classes=n_classes)
    model.load_state_dict(state, strict=True)
    model.eval()

    x = torch.randn(2, 1024)
    with torch.no_grad():
        out = model(x)
    assert out.shape == (2, n_classes)
    probs = torch.softmax(out, dim=-1)
    assert torch.allclose(probs.sum(-1), torch.ones(2), atol=1e-5)
