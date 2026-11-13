"""DRISHTIRAKSHA — Conservative Claim Verification (CLAIM_AI).

Governed by the four canonical verdicts:
- VERIFIED
- CONTRADICTED
- MISLEADING
- UNVERIFIED

Stage 5 & Stage 6 Safeguards:
- Evaluates evidence from Fact-Check APIs or genuine public reference sources.
- Never fabricates outcomes: derives status strictly from retrieved evidence text.
- If no reliable evidence was found, returns UNVERIFIED with clean disclosure.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any

from backend.schemas import ClaimVerdict

logger = logging.getLogger(__name__)


def map_textual_rating_to_verdict(rating_str: str) -> ClaimVerdict:
    """Map textual fact-checker ratings conservatively."""
    r = rating_str.lower().strip()
    if any(k in r for k in ("misleading", "altered", "manipulated", "out of context", "partly false", "partially false", "भ्रामक")):
        return ClaimVerdict.MISLEADING
    if any(k in r for k in ("false", "fake", "incorrect", "hoax", "debunked", "fabricated", "गलत", "झूठ", "असत्य")):
        return ClaimVerdict.CONTRADICTED
    if any(k in r for k in ("true", "correct", "accurate", "verified", "सही", "सत्य")):
        return ClaimVerdict.VERIFIED
    return ClaimVerdict.UNVERIFIED


def evaluate_public_reference_evidence(
    claim_item: dict[str, Any],
    evidence_items: list[dict[str, Any]],
) -> tuple[ClaimVerdict, str]:
    """Evaluate claim veracity against fetched public reference pages (e.g. Wikipedia)."""
    claim_text = claim_item.get("claim_text", "")
    claim_lower = claim_text.lower()
    claim_tokens = set(re.findall(r"\w+", claim_lower))
    
    # Check against snippets and extracts
    combined_ev = " ".join([
        (ev.get("title", "") + " " + ev.get("snippet", "")).lower()
        for ev in evidence_items
    ])

    # Check for direct debunking / contradiction markers in reference text
    contradiction_markers = ["disproven", "archaic conception", "conspiracy theory", "false claim", "debunked", "myth", "hoax", "incorrectly claimed"]
    if any(marker in combined_ev for marker in contradiction_markers):
        # E.g. Flat Earth is described as scientifically disproven
        return ClaimVerdict.CONTRADICTED, "Contradicted by documented public evidence and established scientific consensus."

    # Check for factual verification: key subject and predicate match
    features = claim_item.get("features", {})
    candidate_entities = features.get("candidate_entities", [])
    numbers = features.get("numbers", [])

    # If key entities from claim exist in the reference extract confirming the assertion
    entities_in_ev = [ent for ent in candidate_entities if ent.lower() in combined_ev]
    numbers_in_ev = [num for num in numbers if num in combined_ev]

    # Calculate token overlap
    meaningful_tokens = {t for t in claim_tokens if len(t) > 3 and t not in ("this", "that", "with", "from", "have", "been")}
    overlap = meaningful_tokens.intersection(set(re.findall(r"\w+", combined_ev)))
    overlap_ratio = len(overlap) / max(len(meaningful_tokens), 1)

    if overlap_ratio >= 0.70 and len(entities_in_ev) >= min(len(candidate_entities), 1):
        return ClaimVerdict.VERIFIED, "Corroborated by verified public reference records."

    if overlap_ratio >= 0.40:
        return ClaimVerdict.UNVERIFIED, "Related context found, but specific user claim could not be conclusively verified."

    return ClaimVerdict.UNVERIFIED, "Could not independently verify this claim."


def verify_claim_with_evidence(
    claim_item: dict[str, Any],
    evidence_payload: dict[str, Any],
) -> dict[str, Any]:
    """Conservatively evaluate claim validity against retrieved evidence."""
    now_utc = datetime.now(timezone.utc).isoformat()
    evidence_items = evidence_payload.get("evidence_items", [])
    provider_status = evidence_payload.get("status")

    if provider_status == "PROVIDER_NOT_CONFIGURED" and not evidence_items:
        return {
            "status": ClaimVerdict.UNVERIFIED.value,
            "evidence": [],
            "explanation": "Could not independently verify this claim.",
            "checked_sources": [],
            "checked_at": now_utc,
        }

    if not evidence_items:
        return {
            "status": ClaimVerdict.UNVERIFIED.value,
            "evidence": [],
            "explanation": "Could not independently verify this claim.",
            "checked_sources": [],
            "checked_at": now_utc,
        }

    # If Fact Check API review with explicit rating is present
    top_ev = evidence_items[0]
    rating_str = top_ev.get("rating", "")
    checked_sources = list({ev.get("source_name") for ev in evidence_items if ev.get("source_name")})

    if rating_str:
        mapped_verdict = map_textual_rating_to_verdict(rating_str)
        if mapped_verdict == ClaimVerdict.VERIFIED:
            explanation = f"Verified by {top_ev.get('source_name')}."
        elif mapped_verdict == ClaimVerdict.CONTRADICTED:
            explanation = f"Rated false by {top_ev.get('source_name')}."
        elif mapped_verdict == ClaimVerdict.MISLEADING:
            explanation = f"Flagged as misleading by {top_ev.get('source_name')}."
        else:
            explanation = "Could not independently verify this claim."

        return {
            "status": mapped_verdict.value,
            "evidence": evidence_items,
            "explanation": explanation,
            "checked_sources": checked_sources,
            "checked_at": now_utc,
        }

    # Evaluate against fetched public reference pages
    verdict, explanation = evaluate_public_reference_evidence(claim_item, evidence_items)
    return {
        "status": verdict.value,
        "evidence": evidence_items,
        "explanation": explanation,
        "checked_sources": checked_sources,
        "checked_at": now_utc,
    }
