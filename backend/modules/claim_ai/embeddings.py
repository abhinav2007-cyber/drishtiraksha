"""DRISHTIRAKSHA — Multilingual Semantic Embeddings & Claim Grouping (CLAIM_AI).

Uses the pretrained `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
model via HuggingFace transformers with mean pooling and L2 normalization.

Safeguards:
- Semantic similarity alone does NOT establish truth or verification.
- Changes in numbers, dates, or negation flags prevent automatic claim grouping.
"""
from __future__ import annotations

import logging
import time
from typing import Any

import torch
from transformers import AutoModel, AutoTokenizer

logger = logging.getLogger(__name__)

MODEL_ID = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
MODEL_VERSION = "2.0 (MiniLM-L12)"

_TOKENIZER = None
_MODEL = None


def get_device() -> str:
    return "cuda" if torch.cuda.is_available() else "cpu"


def load_multilingual_model():
    """Load or return cached tokenizer and model."""
    global _TOKENIZER, _MODEL
    if _TOKENIZER is not None and _MODEL is not None:
        return _TOKENIZER, _MODEL

    device = get_device()
    logger.info("Loading multilingual embedding model '%s' on %s ...", MODEL_ID, device)
    _TOKENIZER = AutoTokenizer.from_pretrained(MODEL_ID)
    _MODEL = AutoModel.from_pretrained(MODEL_ID)
    _MODEL.to(device)
    _MODEL.eval()
    logger.info("Multilingual model '%s' ready.", MODEL_ID)
    return _TOKENIZER, _MODEL


def mean_pooling(model_output, attention_mask):
    """Mean Pooling - Take attention mask into account for correct averaging."""
    token_embeddings = model_output[0]
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, 1)
    sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-9)
    return sum_embeddings / sum_mask


def compute_embeddings(texts: list[str]) -> tuple[torch.Tensor, float]:
    """Compute normalized 384-dim embeddings for a list of texts. Returns (embeddings, inference_time_ms)."""
    if not texts:
        return torch.empty((0, 384)), 0.0

    tokenizer, model = load_multilingual_model()
    device = get_device()

    t0 = time.perf_counter()
    encoded = tokenizer(texts, padding=True, truncation=True, max_length=128, return_tensors="pt")
    encoded = {k: v.to(device) for k, v in encoded.items()}

    with torch.no_grad():
        out = model(**encoded)

    embs = mean_pooling(out, encoded["attention_mask"])
    embs = torch.nn.functional.normalize(embs, p=2, dim=1)
    t1 = time.perf_counter()

    latency_ms = round((t1 - t0) * 1000.0, 2)
    return embs.cpu(), latency_ms


def compute_similarity(emb1: torch.Tensor, emb2: torch.Tensor) -> float:
    """Compute cosine similarity between two 1D normalized tensors."""
    return round(float(torch.dot(emb1, emb2).item()), 4)


def group_and_match_claims(
    claims: list[dict[str, Any]],
    similarity_threshold: float = 0.80,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Group semantically aligned claims with safeguards against contradictory/different numbers/negation.

    Returns:
    - updated claims with claim_group_id
    - cross_language_matches list
    """
    if not claims:
        return [], []

    texts = [c["claim_text"] for c in claims]
    embs, _ = compute_embeddings(texts)

    import uuid

    # Initialize each claim with its own group
    for c in claims:
        if not c.get("claim_group_id"):
            c["claim_group_id"] = f"grp_{uuid.uuid4().hex[:10]}"

    n = len(claims)
    cross_lingual_matches = []

    for i in range(n):
        for j in range(i + 1, n):
            c1 = claims[i]
            c2 = claims[j]

            sim = compute_similarity(embs[i], embs[j])

            # Safeguards: Check feature compatibility before grouping
            feat1 = c1.get("features", {})
            feat2 = c2.get("features", {})

            # 1. Negation mismatch safeguard (one asserts, one negates)
            neg1 = feat1.get("has_negation", False)
            neg2 = feat2.get("has_negation", False)
            negation_mismatch = (neg1 != neg2)

            # 2. Number mismatch safeguard (different quantities)
            num1 = set(feat1.get("numbers", []))
            num2 = set(feat2.get("numbers", []))
            number_mismatch = bool(num1 and num2 and num1 != num2)

            # 3. Year mismatch safeguard (different dates)
            yr1 = set(feat1.get("years", []))
            yr2 = set(feat2.get("years", []))
            year_mismatch = bool(yr1 and yr2 and yr1 != yr2)

            # Group if similarity meets threshold and no safeguard violation
            if sim >= similarity_threshold and not negation_mismatch and not number_mismatch and not year_mismatch:
                target_group = c1["claim_group_id"]
                c2["claim_group_id"] = target_group

                # If cross-language match
                if c1["language"] != c2["language"]:
                    cross_lingual_matches.append({
                        "claim_group_id": target_group,
                        "claims": [c1["claim_id"], c2["claim_id"]],
                        "languages": sorted([c1["language"], c2["language"]]),
                        "similarity_score": sim,
                        "method": f"{MODEL_ID} (Cosine Similarity)",
                    })

    return claims, cross_lingual_matches
