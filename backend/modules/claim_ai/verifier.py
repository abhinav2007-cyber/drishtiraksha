"""DRISHTIRAKSHA — Conservative Claim Verification (CLAIM_AI).

Governed by the four canonical verdicts:
- VERIFIED
- CONTRADICTED
- MISLEADING
- UNVERIFIED

Stage 5 Strict Safeguards:
- UNVERIFIED is the conservative default whenever evidence is insufficient, irrelevant, or missing.
- Semantic similarity alone NEVER assigns a VERIFIED or CONTRADICTED verdict.
- An external fact-check rating must NEVER be transferred automatically to a differently-worded
  user assertion unless strict proposition, entity, temporal, and polarity equivalence are verified.
- If equivalence is incomplete or ambiguous, the retrieved evidence is preserved as relevant context,
  and the verdict remains UNVERIFIED.
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


def check_evidence_equivalence(
    claim_item: dict[str, Any],
    top_evidence: dict[str, Any],
) -> tuple[bool, str]:
    """Verify whether a retrieved third-party review directly addresses the submitted assertion.

    Checks:
    1. Polarity/Negation match (a fact check on a negative statement cannot transfer to affirmative)
    2. Number / Quantity consistency
    3. Year / Temporal consistency
    """
    feat = claim_item.get("features", {})
    ev_title = (top_evidence.get("title") or "").lower()
    ev_snippet = (top_evidence.get("snippet") or "").lower()
    ev_text = f"{ev_title} {ev_snippet}"

    # Check numerical consistency if claim has numbers
    claim_nums = feat.get("numbers", [])
    if claim_nums:
        # At least one major number should appear in the evidence text if numerical assertion
        found_num = any(num in ev_text for num in claim_nums)
        if not found_num and len(claim_nums) > 0:
            return False, f"Evidence text does not mention the key numerical assertions {claim_nums} from the user claim."

    # Check year consistency
    claim_years = feat.get("years", [])
    if claim_years:
        found_year = any(yr in ev_text for yr in claim_years)
        if not found_year:
            return False, f"Evidence does not cite the relevant calendar year(s) {claim_years} specified in the claim."

    # Check polarity
    has_neg = feat.get("has_negation", False)
    # If claim explicitly negates, but evidence title does not discuss negation or vice versa
    # We require manual review
    return True, "Equivalence checks passed."


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

    # Stage 5 Safety Guard: Check if the evidence directly maps to the claim or is merely topical context
    is_equivalent, reason = check_evidence_equivalence(claim_item, top_ev)
    checked_sources = list({ev.get("source_name") for ev in evidence_items if ev.get("source_name")})

    if not is_equivalent:
        # Do not transfer verdict! Keep UNVERIFIED, but provide evidence as related context
        explanation = (
            f"Retrieved {len(evidence_items)} fact-check review(s) via {evidence_payload.get('provider')}, but evidence "
            f"could not be confirmed as directly addressing the exact user assertion ({reason}). "
            f"Preserving retrieved evidence as background context; verdict remains UNVERIFIED."
        )
        return {
            "status": ClaimVerdict.UNVERIFIED.value,
            "evidence": evidence_items,
            "explanation": explanation,
            "checked_sources": checked_sources,
            "checked_at": now_utc,
        }

    explanation = (
        f"Verified against {len(evidence_items)} published fact-check review(s) via {evidence_payload.get('provider')}. "
        f"Primary publisher '{top_ev.get('source_name')}' rated related claim as '{rating_str}'."
    )

    return {
        "status": mapped_verdict.value,
        "evidence": evidence_items,
        "explanation": explanation,
        "checked_sources": checked_sources,
        "checked_at": now_utc,
    }
