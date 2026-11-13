"""CLAIM_AI module — Multilingual claim extraction, semantic matching, evidence verification, and narrative drift."""
from backend.modules.claim_ai.service import process_text_claims
from backend.modules.claim_ai.extractor import extract_claims_from_text, detect_language
from backend.modules.claim_ai.embeddings import compute_embeddings, compute_similarity, group_and_match_claims
from backend.modules.claim_ai.evidence import search_fact_check_evidence
from backend.modules.claim_ai.verifier import verify_claim_with_evidence
from backend.modules.claim_ai.drift import analyze_narrative_drift

__all__ = [
    "process_text_claims",
    "extract_claims_from_text",
    "detect_language",
    "compute_embeddings",
    "compute_similarity",
    "group_and_match_claims",
    "search_fact_check_evidence",
    "verify_claim_with_evidence",
    "analyze_narrative_drift",
]
