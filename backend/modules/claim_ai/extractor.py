"""DRISHTIRAKSHA — Multilingual Claim Extraction & Analysis (CLAIM_AI).

Extracts factual statements from user text in English, Hindi, and Telugu.
Preserves Unicode characters, identifies language, segments sentences,
filters non-factual utterances (questions, greetings, opinions),
and extracts key entities, numbers, dates, locations, and negation markers.
"""
from __future__ import annotations

import logging
import re
import unicodedata
from typing import Any

logger = logging.getLogger(__name__)

# ── Language Detection / Heuristics ──────────────────────────────────────────

# Unicode character block ranges:
# Devanagari (Hindi): \u0900-\u097F
# Telugu: \u0C00-\u0C7F
DEVANAGARI_RE = re.compile(r"[\u0900-\u097F]")
TELUGU_RE = re.compile(r"[\u0C00-\u0C7F]")
LATIN_RE = re.compile(r"[A-Za-z]")


def detect_language(text: str, hint: str | None = None) -> str:
    """Identify text language: 'en', 'hi', or 'te'.

    Uses Unicode script character frequencies with fallback to language hint.
    """
    if not text or not text.strip():
        return hint.lower() if hint in ("en", "hi", "te") else "en"

    # Count script characters
    dev_count = len(DEVANAGARI_RE.findall(text))
    tel_count = len(TELUGU_RE.findall(text))
    lat_count = len(LATIN_RE.findall(text))

    if dev_count > tel_count and dev_count > lat_count:
        return "hi"
    if tel_count > dev_count and tel_count > lat_count:
        return "te"
    if lat_count > 0:
        return "en"

    # Fallback to hint or default to English
    if hint and hint.lower() in ("en", "hi", "te"):
        return hint.lower()
    return "en"


# ── Factual Statement Filtering ──────────────────────────────────────────────

QUESTION_WORDS_EN = {"who", "what", "where", "when", "why", "how", "is", "are", "do", "does", "can", "could", "would"}
GREETINGS_EN = {"hello", "hi", "hey", "good morning", "good evening", "namaste", "vanakkam"}
OPINION_MARKERS_EN = {"i think", "i feel", "i believe", "in my opinion", "personally", "maybe"}

QUESTION_WORDS_HI = {"क्या", "कहाँ", "कब", "क्यों", "कैसे", "किसने", "किसको"}
GREETINGS_HI = {"नमस्ते", "नमस्कार", "प्रणाम", "सुप्रभात", "अलविदा"}
OPINION_MARKERS_HI = {"मुझे लगता है", "मेरे विचार से", "मेरी राय में", "शायद"}

QUESTION_WORDS_TE = {"ఎవరు", "ఏమిటి", "ఎక్కడ", "ఎప్పుడు", "ఎందుకు", "ఎలా"}
GREETINGS_TE = {"నమస్కారం", "నమస్తే", "శుభోదయం"}
OPINION_MARKERS_TE = {"నాకు అనిపిస్తుంది", "నా అభిప్రాయం", "బహుశా"}

# Negation patterns
NEGATION_WORDS_EN = {"not", "no", "never", "none", "neither", "nor", "n't", "false", "denied", "refused", "debunked"}
NEGATION_WORDS_HI = {"नहीं", "मत", "झूठ", "असत्य", "इनकार", "खारिज", "ना"}
NEGATION_WORDS_TE = {"కాదు", "లేదు", "వద్దు", "నిరాకరించారు", "తప్పు", "అసత్యం"}


def is_factual_candidate(sentence: str, lang: str) -> tuple[bool, str]:
    """Check if a sentence is a factual claim candidate vs question/greeting/opinion."""
    s_clean = sentence.strip()
    if len(s_clean) < 10:
        return False, "Sentence too short to form a verifiable factual assertion"

    # Question mark check
    if s_clean.endswith("?") or "?" in s_clean:
        return False, "Question, not a declarative factual claim"

    s_lower = s_clean.lower()

    if lang == "hi":
        for g in GREETINGS_HI:
            if s_clean.startswith(g):
                return False, "Greeting/salutation"
        for op in OPINION_MARKERS_HI:
            if op in s_clean:
                return False, "Subjective opinion/sentiment"
    elif lang == "te":
        for g in GREETINGS_TE:
            if s_clean.startswith(g):
                return False, "Greeting/salutation"
        for op in OPINION_MARKERS_TE:
            if op in s_clean:
                return False, "Subjective opinion/sentiment"
    else:
        for g in GREETINGS_EN:
            if s_lower.startswith(g):
                return False, "Greeting/salutation"
        for op in OPINION_MARKERS_EN:
            if op in s_lower:
                return False, "Subjective opinion/sentiment"

    return True, "Factual candidate"


# ── Sentence Splitting ───────────────────────────────────────────────────────

def split_sentences(text: str) -> list[str]:
    """Split text into sentences across English (. ! ?), Hindi (। ? !), and Telugu (. ? !)."""
    # Normalize unicode
    norm_text = unicodedata.normalize("NFC", text)
    # Split on periods, exclamation marks, question marks, danda (।), double danda (॥), newlines
    raw_parts = re.split(r"[\n\r]+|[.!?।॥]+", norm_text)
    sentences = [p.strip() for p in raw_parts if p.strip()]
    return sentences


# ── Entity & Key Feature Extraction ──────────────────────────────────────────

# Number regex: digits, commas/dots in numbers, and Indian numbering notation
NUMBER_RE = re.compile(r"\b(?:\d{1,3}(?:,\d{2,3})*(?:\.\d+)?|\d+)\b")
YEAR_RE = re.compile(r"\b(19\d\d|20\d\d)\b")

# Ambiguous role / entity patterns (e.g. 'Hyderabad CM', 'Delhi Minister', 'Prime Minister of UK')
AMBIGUOUS_ROLE_RE = re.compile(
    r"\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:CM|PM|Chief Minister|Prime Minister|Minister|Governor|Mayor|Judge|President))\b|"
    r"\b(?:(?:CM|PM|Chief Minister|Prime Minister|Minister|Governor|Mayor|Judge|President)\s+of\s+[A-Z][a-z]+)\b",
    re.IGNORECASE,
)

# Dependent clause prefixes (e.g. 'Cause: heart attack', 'Reason: brake failure', 'Due to: heavy rainfall')
DEPENDENT_CLAUSE_PREFIX_RE = re.compile(
    r"^(?:cause|reason|due to|because of|source|origin|according to|reported by|alleged(?:ly)?)\s*[:\-]\s*",
    re.IGNORECASE,
)


def extract_features(text: str, lang: str) -> dict[str, Any]:
    """Extract numbers, dates, negation markers, candidate entities, and ambiguous roles from claim text."""
    numbers = NUMBER_RE.findall(text)
    years = YEAR_RE.findall(text)

    # Detect negation
    tokens = set(re.findall(r"\w+", text.lower(), re.UNICODE))
    negations_found = []

    if lang == "hi":
        negations_found = list(tokens.intersection(NEGATION_WORDS_HI))
    elif lang == "te":
        negations_found = list(tokens.intersection(NEGATION_WORDS_TE))
    else:
        negations_found = list(tokens.intersection(NEGATION_WORDS_EN))

    # Candidate capitalized entities (for English/transliterated scripts)
    capitalized = re.findall(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b", text)

    # Ambiguous entity roles
    ambiguous_roles = AMBIGUOUS_ROLE_RE.findall(text)

    return {
        "numbers": sorted(list(set(numbers))),
        "years": sorted(list(set(years))),
        "has_negation": len(negations_found) > 0,
        "negation_words": negations_found,
        "candidate_entities": capitalized,
        "ambiguous_roles": list(set(ambiguous_roles)),
    }


# ── Core Claim Extraction Pipeline ──────────────────────────────────────────

def extract_claims_from_text(
    text: str,
    language_hint: str | None = None,
    source_label: str = "user_submission",
) -> list[dict[str, Any]]:
    """Extract structured claim objects from submitted text.

    Preserves context by linking dependent clauses (e.g. 'Cause: heart attack')
    to preceding assertions rather than emitting ungrounded fragments.
    """
    if not text or not text.strip():
        return []

    global_lang = detect_language(text, language_hint)
    raw_sentences = split_sentences(text)

    # Pre-pass: stitch dependent clauses to their parent assertion if present
    stitched_sentences: list[dict[str, Any]] = []
    for s in raw_sentences:
        s_clean = s.strip()
        if not s_clean:
            continue

        is_dependent = bool(DEPENDENT_CLAUSE_PREFIX_RE.match(s_clean))
        if is_dependent and stitched_sentences:
            parent = stitched_sentences[-1]
            parent["claim_text"] = f"{parent['claim_text']}. {s_clean}"
            parent["dependent_clauses"].append(s_clean)
        else:
            stitched_sentences.append({
                "claim_text": s_clean,
                "original_text": s_clean,
                "dependent_clauses": [],
            })

    extracted_claims = []
    import uuid

    for item in stitched_sentences:
        sentence = item["claim_text"]
        sent_lang = detect_language(sentence, hint=global_lang)
        is_candidate, reason = is_factual_candidate(sentence, sent_lang)
        features = extract_features(sentence, sent_lang)

        limitations = [
            f"Heuristic extraction for language '{sent_lang}'.",
            "Does not perform full semantic parsing or syntactic dependency resolution.",
            "Non-declarative statements (questions/greetings) are filtered out.",
        ]
        if features.get("ambiguous_roles"):
            limitations.append(
                f"Contains ambiguous role entity: {', '.join(features['ambiguous_roles'])}. "
                "System does not guess person identity without official confirmation."
            )
        if item["dependent_clauses"]:
            limitations.append(
                f"Linked dependent clause ({', '.join(item['dependent_clauses'])}) to preserve event context."
            )

        claim_id = f"clm_{uuid.uuid4().hex[:12]}"
        extracted_claims.append({
            "claim_id": claim_id,
            "claim_text": sentence,
            "original_text": item["original_text"],
            "dependent_clauses": item["dependent_clauses"],
            "language": sent_lang,
            "is_factual_candidate": is_candidate,
            "filter_reason": reason,
            "extracted_from": source_label,
            "features": features,
            "limitations": limitations,
        })

    # If all sentences were filtered as non-factual, but text is non-empty, keep the main text marked as unverified
    if not extracted_claims and text.strip():
        claim_id = f"clm_{uuid.uuid4().hex[:12]}"
        features = extract_features(text.strip(), global_lang)
        extracted_claims.append({
            "claim_id": claim_id,
            "claim_text": text.strip(),
            "original_text": text.strip(),
            "dependent_clauses": [],
            "language": global_lang,
            "is_factual_candidate": True,
            "filter_reason": "Single utterance fallback",
            "extracted_from": source_label,
            "features": features,
            "limitations": ["Fallback extraction on raw utterance."],
        })

    return extracted_claims
