"""
CrossAttentionClassifier — trainable head on top of the frozen ECGFounder
encoder. Extracted from CELL 30 of 499a-both-frameworks.ipynb (see
reference/classifier.py for the original, pasted in after this module was
initially reconstructed from checkpoint tensor shapes alone — that guess
turned out to match this source exactly: num_heads=8, the norm(x + attn_out)
residual, and the same 2-layer MLP head. Verified via
backend/tests/test_classifier_shapes.py, which loads every fold checkpoint
with strict=True).

Architecture (input → output):

    x  (B, 1024)  <- frozen ECGFounder embedding
      |
      +-------- query_proj -- Linear(1024 -> 1024) --> q (B, 1, 1024)
      |
      |                                +-- class_keys   (C, 1024) learnable
      |                                +-- class_values (C, 1024) learnable
      v                                v
    MultiheadAttention(embed=1024, heads=8, batch_first=True)
      |       query=q, key=class_keys, value=class_values
      v
    attn_out (B, 1, 1024) -- squeeze -> (B, 1024)
      |
      |  (residual: h = x + attn_out; then LayerNorm)
      v
    h (B, 1024) -- Linear(1024 -> 256) -> ReLU -> Dropout(0.3) -> Linear(256 -> C)
      |
      v
    logits (B, C)

IMPORTANT: num_classes must match the checkpoint being loaded.
  - Beat-level (leaky) checkpoints were trained with 10 classes.
  - Grouped (record-level, honest) checkpoints were trained with 9 classes
    (SVT merged into Other). This is what ensemble.py expects.
Loading a checkpoint with the wrong num_classes will raise a size-mismatch
error in load_state_dict — that is the correct behaviour, don't silence it.
"""

import torch
import torch.nn as nn


class CrossAttentionClassifier(nn.Module):
    def __init__(self,
                 embed_dim=1024,
                 num_classes=9,       # 9 for the grouped/record-level run
                 num_heads=8,
                 mlp_hidden=256,
                 dropout=0.3):
        super().__init__()
        assert embed_dim % num_heads == 0, \
            f"embed_dim ({embed_dim}) must be divisible by num_heads ({num_heads})"

        self.embed_dim = embed_dim
        self.num_classes = num_classes

        # Query projection: transforms sample embedding into attention query
        self.query_proj = nn.Linear(embed_dim, embed_dim)

        # Learnable class-level keys and values (shape: [C, D])
        self.class_keys = nn.Parameter(torch.randn(num_classes, embed_dim) * 0.02)
        self.class_values = nn.Parameter(torch.randn(num_classes, embed_dim) * 0.02)

        # Multi-head cross-attention
        self.attn = nn.MultiheadAttention(
            embed_dim=embed_dim,
            num_heads=num_heads,
            dropout=dropout,
            batch_first=True,
        )

        # Residual + LayerNorm (post-attention)
        self.norm = nn.LayerNorm(embed_dim)

        # MLP head producing final class logits
        self.classifier = nn.Sequential(
            nn.Linear(embed_dim, mlp_hidden),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),
            nn.Linear(mlp_hidden, num_classes),
        )

    def forward(self, x):
        """
        Args:
            x: (B, embed_dim) — ECGFounder embeddings
        Returns:
            logits: (B, num_classes)
        """
        B = x.shape[0]

        # 1. Project input to query, add sequence dim for MHA
        q = self.query_proj(x).unsqueeze(1)                       # (B, 1, D)

        # 2. Broadcast class keys/values to batch
        k = self.class_keys.unsqueeze(0).expand(B, -1, -1)        # (B, C, D)
        v = self.class_values.unsqueeze(0).expand(B, -1, -1)      # (B, C, D)

        # 3. Cross-attention — single query attends over C class tokens
        attn_out, _ = self.attn(q, k, v, need_weights=False)      # (B, 1, D)
        attn_out = attn_out.squeeze(1)                             # (B, D)

        # 4. Residual + LayerNorm
        h = self.norm(x + attn_out)                                # (B, D)

        # 5. MLP classifier
        return self.classifier(h)                                  # (B, C)


if __name__ == '__main__':
    # Sanity check — matches the test in CELL 30 of the notebook.
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = CrossAttentionClassifier(embed_dim=1024, num_classes=9).to(device)
    model.eval()
    with torch.no_grad():
        dummy = torch.randn(4, 1024, device=device)
        logits = model(dummy)
    assert logits.shape == (4, 9), f"Expected (4, 9), got {tuple(logits.shape)}"
    total = sum(p.numel() for p in model.parameters())
    print(f"CrossAttentionClassifier OK — output shape {tuple(logits.shape)}, "
          f"{total:,} params")
