"""DRISHTIRAKSHA — Claim AI Service Orchestrator (CLAIM_AI).

Coordinates:
1. Multilingual claim extraction (EN, HI, TE).
2. Semantic embedding generation & cross-lingual grouping.
3. Live evidence search via configured provider (Google Fact Check Tools API).
4. Conservative claim verification (VERIFIED, CONTRADICTED, MISLEADING, UNVERIFIED).
5. Narrative drift analysis for related claims.
"""
from __future__ import annotations

import logging
from typing import Any

from backend.modules.claim_ai.drift import analyze_narrative_drift
from backend.modules.claim_ai.embeddings import group_and_match_claims
from backend.modules.claim_ai.evidence import search_fact_check_evidence
from backend.modules.claim_ai.extractor import extract_claims_from_text
from backend.modules.claim_ai.verifier import verify_claim_with_evidence
from backend.schemas import (
    Claim,
    ClaimResult,
    ClaimVerification,
    ClaimVerdict,
    CrossLanguageMatch,
    EvidenceItem,
    ModuleStatusEnum,
)

logger = logging.getLogger(__name__)


def process_text_claims(
    text: str,
    investigation_id: str,
    language_hint: str | None = None,
) -> ClaimResult:
    """Execute end-to-end claim extraction, embedding, evidence check, and verification."""
    clean_text = text.strip() if text else ""
    if not clean_text:
        return ClaimResult(
            investigation_id=investigation_id,
            status=ModuleStatusEnum.NOT_APPLICABLE,
            claims=[],
            cross_language_matches=[],
        )

    # 1. Extract claims
    raw_claims = extract_claims_from_text(
        text=clean_text,
        language_hint=language_hint,
        source_label=f"investigation:{investigation_id}",
    )

    if not raw_claims:
        return ClaimResult(
            investigation_id=investigation_id,
            status=ModuleStatusEnum.COMPLETED,
            claims=[],
            cross_language_matches=[],
        )

    # 2. Semantic matching and grouping
    grouped_claims, cross_lingual_raw = group_and_match_claims(raw_claims)

    # 3. Evidence retrieval & Verification per claim
    verified_claims: list[Claim] = []

    for item in grouped_claims:
        # Search evidence if it's a factual candidate
        ev_payload = {"status": "NOT_SEARCHED", "evidence_items": []}
        if item.get("is_factual_candidate", True):
            ev_payload = search_fact_check_evidence(
                query=item["claim_text"],
                language_code=item["language"],
            )

        verif_data = verify_claim_with_evidence(item, ev_payload)

        # Convert to Pydantic models
        evidence_items = [
            EvidenceItem(
                evidence_id=e["evidence_id"],
                claim_id=item["claim_id"],
                source_type=e.get("source_type", ""),
                source_name=e.get("source_name", ""),
                source_url=e.get("source_url", ""),
                title=e.get("title", ""),
                snippet=e.get("snippet", ""),
                rating=e.get("rating", ""),
                retrieval_method=e.get("retrieval_method", ""),
                relevance_score=e.get("relevance_score"),
            )
            for e in verif_data.get("evidence", [])
        ]

        verification_obj = ClaimVerification(
            status=ClaimVerdict(verif_data["status"]),
            evidence=evidence_items,
            explanation=verif_data.get("explanation", ""),
            checked_sources=verif_data.get("checked_sources", []),
        )

        verified_claims.append(
            Claim(
                claim_id=item["claim_id"],
                claim_text=item["claim_text"],
                language=item["language"],
                extracted_from=item.get("extracted_from", ""),
                claim_group_id=item.get("claim_group_id"),
                verification=verification_obj,
            )
        )

    # 4. Format cross-lingual matches
    cross_matches = [
        CrossLanguageMatch(
            claim_group_id=m["claim_group_id"],
            claims=m["claims"],
            languages=m["languages"],
            similarity_score=m["similarity_score"],
            method=m["method"],
        )
        for m in cross_lingual_raw
    ]

    return ClaimResult(
        investigation_id=investigation_id,
        status=ModuleStatusEnum.COMPLETED,
        claims=verified_claims,
        cross_language_matches=cross_matches,
    )
