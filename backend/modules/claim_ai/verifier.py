"""DRISHTIRAKSHA — Conservative Claim Verification (CLAIM_AI).

Governed by the four canonical verdicts:
- VERIFIED
- CONTRADICTED
- MISLEADING
- UNVERIFIED

Rules:
- UNVERIFIED is the conservative default whenever evidence is insufficient, irrelevant, or missing.
- Semantic similarity alone NEVER assigns a VERIFIED or CONTRADICTED verdict.
- Ratings from third-party fact-checkers are reported faithfully.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from backend.schemas import ClaimVerdict

logger = logging.getLogger(__name__)


def map_textual_rating_to_verdict(rating_str: str) -> ClaimVerdict:
    """Map textual fact-checker ratings conservatively."""
    r = rating_str.lower().strip()
    # Check MISLEADING first so phrases like 'partly false' or 'misleading' don't get collapsed into pure CONTRADICTED
    if any(k in r for k in ("misleading", "altered", "manipulated", "out of context", "partly false", "partially false", "भ्रामक")):
        return ClaimVerdict.MISLEADING
    if any(k in r for k in ("false", "fake", "incorrect", "hoax", "debunked", "fabricated", "गलत", "झूठ", "असत्य")):
        return ClaimVerdict.CONTRADICTED
    if any(k in r for k in ("true", "correct", "accurate", "verified", "सही", "सत्य")):
        return ClaimVerdict.VERIFIED
    return ClaimVerdict.UNVERIFIED


def verify_claim_with_evidence(
    claim_item: dict[str, Any],
    evidence_payload: dict[str, Any],
) -> dict[str, Any]:
    """Conservatively evaluate claim validity against retrieved evidence."""
    now_utc = datetime.now(timezone.utc).isoformat()
    evidence_items = evidence_payload.get("evidence_items", [])
    provider_status = evidence_payload.get("status")

    if provider_status == "PROVIDER_NOT_CONFIGURED":
        return {
            "status": ClaimVerdict.UNVERIFIED.value,
            "evidence": [],
            "explanation": "No external fact-check evidence provider is configured (GOOGLE_FACT_CHECK_API_KEY missing). Stance and truth value cannot be independently verified; returning UNVERIFIED by default.",
            "checked_sources": [],
            "checked_at": now_utc,
        }

    if not evidence_items:
        return {
            "status": ClaimVerdict.UNVERIFIED.value,
            "evidence": [],
            "explanation": f"No verified third-party fact-checks found matching this claim query ({evidence_payload.get('provider')}). Verdict defaults conservatively to UNVERIFIED.",
            "checked_sources": [evidence_payload.get("provider", "Google Fact Check Tools API")],
            "checked_at": now_utc,
        }

    # If evidence items were retrieved, inspect primary review rating
    top_ev = evidence_items[0]
    rating_str = top_ev.get("rating", "")
    mapped_verdict = map_textual_rating_to_verdict(rating_str)

    explanation = (
        f"Verified against {len(evidence_items)} published fact-check review(s) via {evidence_payload.get('provider')}. "
        f"Primary publisher '{top_ev.get('source_name')}' rated related claim as '{rating_str}'."
    )

    checked_sources = list({ev.get("source_name") for ev in evidence_items if ev.get("source_name")})

    return {
        "status": mapped_verdict.value,
        "evidence": evidence_items,
        "explanation": explanation,
        "checked_sources": checked_sources,
        "checked_at": now_utc,
    }
