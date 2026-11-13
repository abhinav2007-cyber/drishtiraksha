"""DRISHTIRAKSHA — Genuine Evidence Retrieval Service (CLAIM_AI).

Retrieves verified evidence from authorized sources such as Google Fact Check Tools API.
Enforces strict zero-fabrication:
- If API key is not configured, returns documented UNAVAILABLE status.
- Never fabricates evidence snippets, citations, URLs, or mock ratings.
- Reads API key securely from environment (GOOGLE_FACT_CHECK_API_KEY).
"""
from __future__ import annotations

import logging
import os
import urllib.parse
import urllib.request
import json
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

API_URL = "https://factchecktools.googleapis.com/v1alpha1/claims:search"


def get_fact_check_api_key() -> str | None:
    """Retrieve Google Fact Check Tools API key from environment."""
    return (
        os.getenv("GOOGLE_FACT_CHECK_API_KEY")
        or os.getenv("FACT_CHECK_API_KEY")
        or os.getenv("GOOGLE_API_KEY")
    )


def search_fact_check_evidence(
    query: str,
    language_code: str = "en",
    max_results: int = 5,
) -> dict[str, Any]:
    """Execute real evidence search against Google Fact Check Tools API.

    Returns structured evidence results or explicit provider unavailability details.
    """
    api_key = get_fact_check_api_key()
    now_utc = datetime.now(timezone.utc).isoformat()

    if not api_key:
        return {
            "status": "PROVIDER_NOT_CONFIGURED",
            "provider": "Google Fact Check Tools API",
            "query": query,
            "evidence_items": [],
            "retrieved_at": now_utc,
            "message": "GOOGLE_FACT_CHECK_API_KEY is not configured in the server environment. External evidence retrieval is unavailable. No simulated evidence was generated.",
        }

    # Prepare query
    clean_query = query.strip()
    if not clean_query:
        return {
            "status": "EMPTY_QUERY",
            "provider": "Google Fact Check Tools API",
            "query": query,
            "evidence_items": [],
            "retrieved_at": now_utc,
            "message": "Query string is empty.",
        }

    params = {
        "key": api_key,
        "query": clean_query,
        "pageSize": max_results,
    }
    if language_code in ("en", "hi", "te"):
        params["languageCode"] = language_code

    url = f"{API_URL}?{urllib.parse.urlencode(params)}"

    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Drishtiraksha-Misinformation-Intelligence/0.4.0"},
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        raw_claims = data.get("claims", [])
        evidence_items = []

        import uuid
        for item in raw_claims:
            claim_text = item.get("text", "")
            claim_reviews = item.get("claimReview", [])
            for rev in claim_reviews:
                publisher = rev.get("publisher", {})
                pub_name = publisher.get("name", "Unknown Fact-Checker")
                pub_site = publisher.get("site", "")
                review_url = rev.get("url", "")
                title = rev.get("title", claim_text)
                rating = rev.get("textualRating", "")
                review_date = rev.get("reviewDate")

                ev_id = f"ev_{uuid.uuid4().hex[:12]}"
                evidence_items.append({
                    "evidence_id": ev_id,
                    "source_type": "FACT_CHECK_API",
                    "source_name": pub_name,
                    "source_url": review_url,
                    "title": title,
                    "snippet": f"Reviewed claim: '{claim_text}'. Stated rating: {rating}",
                    "rating": rating,
                    "retrieved_at": now_utc,
                    "retrieval_method": "Google Fact Check Tools API",
                    "relevance_score": 1.0,
                })

        return {
            "status": "SUCCESS",
            "provider": "Google Fact Check Tools API",
            "query": clean_query,
            "evidence_items": evidence_items,
            "retrieved_at": now_utc,
            "message": f"Retrieved {len(evidence_items)} evidence reviews.",
        }

    except Exception as exc:
        logger.warning("Fact Check API request failed: %s", exc)
        return {
            "status": "REQUEST_FAILED",
            "provider": "Google Fact Check Tools API",
            "query": clean_query,
            "evidence_items": [],
            "retrieved_at": now_utc,
            "message": f"External evidence retrieval failed: {type(exc).__name__}",
        }
