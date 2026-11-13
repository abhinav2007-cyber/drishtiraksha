"""DRISHTIRAKSHA — Narrative Drift & Mutation Analysis (CLAIM_AI).

Compares related claims within a claim group or across submissions to report
observable differences:
- Numerical changes (quantities, counts)
- Date / Year alterations
- Negation flips (assertion vs denial)
- Entity differences
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def analyze_narrative_drift(
    claim_a: dict[str, Any],
    claim_b: dict[str, Any],
) -> dict[str, Any]:
    """Perform deterministic comparison between two related claims.

    Reports observable changes without asserting intent or manipulation.
    """
    feat_a = claim_a.get("features", {})
    feat_b = claim_b.get("features", {})

    # 1. Numbers comparison
    nums_a = set(feat_a.get("numbers", []))
    nums_b = set(feat_b.get("numbers", []))
    number_drift = bool(nums_a != nums_b and (nums_a or nums_b))

    # 2. Years / Dates comparison
    yrs_a = set(feat_a.get("years", []))
    yrs_b = set(feat_b.get("years", []))
    year_drift = bool(yrs_a != yrs_b and (yrs_a or yrs_b))

    # 3. Negation flip
    neg_a = feat_a.get("has_negation", False)
    neg_b = feat_b.get("has_negation", False)
    negation_flip = (neg_a != neg_b)

    # 4. Language shift
    lang_a = claim_a.get("language", "en")
    lang_b = claim_b.get("language", "en")
    language_shift = (lang_a != lang_b)

    observable_mutations = []
    if number_drift:
        observable_mutations.append({
            "type": "NUMERICAL_DISCREPANCY",
            "claim_a_numbers": list(nums_a),
            "claim_b_numbers": list(nums_b),
            "note": f"Claim A contains numbers {list(nums_a)}, while Claim B contains {list(nums_b)}.",
        })
    if year_drift:
        observable_mutations.append({
            "type": "TEMPORAL_DISCREPANCY",
            "claim_a_years": list(yrs_a),
            "claim_b_years": list(yrs_b),
            "note": f"Different calendar years cited: A={list(yrs_a)} vs B={list(yrs_b)}.",
        })
    if negation_flip:
        observable_mutations.append({
            "type": "POLARITY_INVERSION",
            "claim_a_negation": neg_a,
            "claim_b_negation": neg_b,
            "note": "One claim contains explicit negation markers while the other does not.",
        })
    if language_shift:
        observable_mutations.append({
            "type": "CROSS_LINGUAL_TRANSLATION",
            "from_language": lang_a,
            "to_language": lang_b,
            "note": f"Claim statement observed across language boundary: {lang_a} → {lang_b}.",
        })

    return {
        "claim_a_id": claim_a.get("claim_id"),
        "claim_b_id": claim_b.get("claim_id"),
        "has_observable_drift": len(observable_mutations) > 0,
        "mutations": observable_mutations,
        "disclaimer": "Reported mutations reflect surface linguistic and numeric differences; chronological progression or intent requires external provenance.",
    }
