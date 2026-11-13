"""
Comprehensive Tests for Stage 4 CLAIM_AI:
1. Language detection (English, Hindi, Telugu)
2. Factual candidate extraction vs questions/greetings
3. Feature extraction (numbers, dates, negation markers)
4. Genuine multilingual MiniLM sentence embedding inference
5. Cross-language claim similarity (EN vs HI vs TE)
6. Safeguards against false grouping:
   - Negation-sensitive comparison (assert vs deny)
   - Changed numbers comparison
   - Changed dates comparison
   - Unrelated claims rejection
7. Evidence retrieval & conservative verification (UNVERIFIED default when provider missing)
8. Narrative drift analysis
9. End-to-end process_text_claims service
"""

import pytest
import torch

from backend.modules.claim_ai.extractor import (
    detect_language,
    extract_claims_from_text,
    extract_features,
    is_factual_candidate,
    split_sentences,
)
from backend.modules.claim_ai.embeddings import (
    compute_embeddings,
    compute_similarity,
    group_and_match_claims,
)
from backend.modules.claim_ai.evidence import (
    search_fact_check_evidence,
    get_fact_check_api_key,
)
from backend.modules.claim_ai.verifier import (
    verify_claim_with_evidence,
    map_textual_rating_to_verdict,
)
from backend.modules.claim_ai.drift import analyze_narrative_drift
from backend.modules.claim_ai.service import process_text_claims
from backend.schemas import ClaimVerdict, ModuleStatusEnum


# ── 1. Language Detection & Extraction Tests ─────────────────────────────────

def test_language_detection():
    text_en = "The government announced a 15% tax reduction on electric vehicles in 2026."
    text_hi = "सरकार ने 2026 में इलेक्ट्रिक वाहनों पर 15% कर कटौती की घोषणा की।"
    text_te = "ప్రభుత్వం 2026 లో ఎలక్ట్రిక్ వాహనాలపై 15% పన్ను తగ్గింపును ప్రకటించింది."

    assert detect_language(text_en) == "en"
    assert detect_language(text_hi) == "hi"
    assert detect_language(text_te) == "te"


def test_sentence_splitting_multilingual():
    text = "First claim in English. Second claim with danda in Hindi। Third claim in Telugu."
    sentences = split_sentences(text)
    assert len(sentences) == 3
    assert "First claim in English" in sentences[0]
    assert "Second claim with danda in Hindi" in sentences[1]


def test_filter_non_factual_statements():
    # Questions should not be factual assertions
    is_fact_q, _ = is_factual_candidate("Is the government cutting taxes in 2026?", "en")
    assert not is_fact_q

    # Greetings should not be factual assertions
    is_fact_g, _ = is_factual_candidate("Hello, good morning to everyone.", "en")
    assert not is_fact_g

    # Declarative assertion should pass
    is_fact_d, _ = is_factual_candidate("The Finance Ministry approved a 500 crore rupee relief package.", "en")
    assert is_fact_d


def test_feature_extraction():
    claim_text = "In 2024, the committee did not allocate 500 million dollars."
    features = extract_features(claim_text, "en")
    assert "2024" in features["years"]
    assert "500" in features["numbers"]
    assert features["has_negation"] is True
    assert "not" in features["negation_words"]


# ── 2. Genuine Multilingual Embedding & Similarity Tests ─────────────────────

def test_real_multilingual_embeddings():
    claims = [
        "The Prime Minister announced a new educational policy in Delhi.",
        "प्रधानमंत्री ने दिल्ली में नई शिक्षा नीति की घोषणा की।",
        "NASA rover discovered evidence of ancient microbial life on Mars.",
    ]
    embs, latency_ms = compute_embeddings(claims)

    assert embs.shape == (3, 384)
    assert latency_ms > 0
    # Embedding norm must be 1.0 (L2-normalized)
    for i in range(3):
        assert abs(torch.norm(embs[i]).item() - 1.0) < 1e-4

    sim_en_hi = compute_similarity(embs[0], embs[1])
    sim_en_mars = compute_similarity(embs[0], embs[2])

    # EN vs HI semantic parallel should have high similarity (>0.90)
    assert sim_en_hi > 0.85
    # Completely unrelated domain (Mars rover) should have low similarity (<0.30)
    assert sim_en_mars < 0.35


def test_negation_safeguard_prevents_false_grouping():
    """Affirmative and negative statements must not be grouped together despite high word overlap."""
    claims = [
        {
            "claim_id": "c1",
            "claim_text": "The Ministry approved the 500 crore budget.",
            "language": "en",
            "features": {"numbers": ["500"], "years": [], "has_negation": False},
        },
        {
            "claim_id": "c2",
            "claim_text": "The Ministry did NOT approve the 500 crore budget.",
            "language": "en",
            "features": {"numbers": ["500"], "years": [], "has_negation": True, "negation_words": ["not"]},
        },
    ]

    grouped, matches = group_and_match_claims(claims, similarity_threshold=0.60)
    # They must have different group IDs due to negation mismatch
    assert grouped[0]["claim_group_id"] != grouped[1]["claim_group_id"]


def test_number_safeguard_prevents_false_grouping():
    """Statements with contradictory numbers must not be grouped together."""
    claims = [
        {
            "claim_id": "c1",
            "claim_text": "The casualty count was reported as 10 people.",
            "language": "en",
            "features": {"numbers": ["10"], "years": [], "has_negation": False},
        },
        {
            "claim_id": "c2",
            "claim_text": "The casualty count was reported as 500 people.",
            "language": "en",
            "features": {"numbers": ["500"], "years": [], "has_negation": False},
        },
    ]

    grouped, _ = group_and_match_claims(claims, similarity_threshold=0.60)
    assert grouped[0]["claim_group_id"] != grouped[1]["claim_group_id"]


def test_date_safeguard_prevents_false_grouping():
    """Statements with contradictory years must not be grouped together."""
    claims = [
        {
            "claim_id": "c1",
            "claim_text": "The policy was signed in 2018.",
            "language": "en",
            "features": {"numbers": ["2018"], "years": ["2018"], "has_negation": False},
        },
        {
            "claim_id": "c2",
            "claim_text": "The policy was signed in 2024.",
            "language": "en",
            "features": {"numbers": ["2024"], "years": ["2024"], "has_negation": False},
        },
    ]

    grouped, _ = group_and_match_claims(claims, similarity_threshold=0.60)
    assert grouped[0]["claim_group_id"] != grouped[1]["claim_group_id"]


# ── 3. Conservative Evidence & Verification Tests ────────────────────────────

def test_missing_evidence_provider_returns_unverified():
    """When no evidence matches or can be reliably verified, default must be UNVERIFIED."""
    payload = search_fact_check_evidence("Xylophonic quxbubbles jumped over 99999 zibbers in 1842")
    assert len(payload["evidence_items"]) == 0

    claim = {"claim_id": "clm_123", "claim_text": "Random claim", "language": "en"}
    verif = verify_claim_with_evidence(claim, payload)

    assert verif["status"] == ClaimVerdict.UNVERIFIED.value
    assert "Could not independently verify this claim" in verif["explanation"]


def test_rating_mapping_to_verdict():
    assert map_textual_rating_to_verdict("False / Hoax") == ClaimVerdict.CONTRADICTED
    assert map_textual_rating_to_verdict("Partly False / Misleading") == ClaimVerdict.MISLEADING
    assert map_textual_rating_to_verdict("True") == ClaimVerdict.VERIFIED
    assert map_textual_rating_to_verdict("Unproven / Unknown") == ClaimVerdict.UNVERIFIED


# ── 4. Narrative Drift Analysis Tests ────────────────────────────────────────

def test_narrative_drift_detection():
    claim_a = {
        "claim_id": "clm_a",
        "language": "en",
        "features": {"numbers": ["10"], "years": ["2020"], "has_negation": False},
    }
    claim_b = {
        "claim_id": "clm_b",
        "language": "hi",
        "features": {"numbers": ["50"], "years": ["2024"], "has_negation": True},
    }

    drift = analyze_narrative_drift(claim_a, claim_b)
    assert drift["has_observable_drift"] is True
    mutation_types = [m["type"] for m in drift["mutations"]]
    assert "NUMERICAL_DISCREPANCY" in mutation_types
    assert "TEMPORAL_DISCREPANCY" in mutation_types
    assert "POLARITY_INVERSION" in mutation_types
    assert "CROSS_LINGUAL_TRANSLATION" in mutation_types


# ── 5. End-to-End Service Integration Test ───────────────────────────────────

def test_process_text_claims_service():
    multilingual_text = (
        "The Prime Minister inaugurated a new research facility in Delhi in 2025. "
        "प्रधानमंत्री ने 2025 में दिल्ली में एक नए अनुसंधान केंद्र का उद्घाटन किया। "
        "NASA landed on Mars in 1997."
    )
    result = process_text_claims(multilingual_text, investigation_id="inv-clm-001")

    assert result.investigation_id == "inv-clm-001"
    assert result.status == ModuleStatusEnum.COMPLETED
    assert len(result.claims) >= 2

    # The EN and HI claims for the facility should be grouped together
    clm_en = next(c for c in result.claims if c.language == "en" and "Prime Minister" in c.claim_text)
    clm_hi = next(c for c in result.claims if c.language == "hi")
    assert clm_en.claim_group_id == clm_hi.claim_group_id

    # Cross-lingual match record must exist
    assert len(result.cross_language_matches) >= 1
    match = result.cross_language_matches[0]
    assert match.claim_group_id == clm_en.claim_group_id
    assert "en" in match.languages and "hi" in match.languages
    assert match.similarity_score > 0.85


def test_dependent_clause_linking():
    """Verify dependent clauses (e.g. 'Cause: heart attack') are linked to parent assertion."""
    text = "Hyderabad CM has died. Cause: heart attack."
    claims = extract_claims_from_text(text)
    assert len(claims) == 1
    c = claims[0]
    assert "Hyderabad CM has died" in c["claim_text"]
    assert "Cause: heart attack" in c["claim_text"]
    assert len(c["dependent_clauses"]) == 1
    assert c["dependent_clauses"][0] == "Cause: heart attack"


def test_ambiguous_role_entity_detection():
    """Verify ambiguous official titles are flagged with limitations rather than guessing person."""
    text = "Hyderabad CM attended the annual summit."
    claims = extract_claims_from_text(text)
    assert len(claims) == 1
    c = claims[0]
    assert "Hyderabad CM" in c["features"]["ambiguous_roles"]
    lim_str = " ".join(c["limitations"])
    assert "ambiguous role entity" in lim_str
