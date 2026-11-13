"""Comprehensive backend tests for DRISHTIRAKSHA Stage 1.

Tests:
 1. Health endpoint
 2. JSON text investigation creation
 3. Media upload validation
 4. Investigation ID generation
 5. Investigation persistence
 6. Investigation retrieval
 7. Investigation listing
 8. Investigation state transitions
 9. Module unavailable/not-applicable responses
10. Invalid input handling
11. Rejecting oversized files
"""
from __future__ import annotations

import asyncio

import pytest

from backend.tests.conftest import TINY_JPEG


# ── 1. Health endpoint ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_endpoint(ac):
    resp = await ac.get("/api/v1/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["status"] == "healthy"
    assert "modules" in body["data"]


# ── 2. JSON text investigation creation ────────────────────────────────────

@pytest.mark.asyncio
async def test_create_text_investigation_json(ac):
    resp = await ac.post(
        "/api/v1/investigations/json",
        json={"input_type": "text", "text": "A major bank will close tomorrow"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["investigation_id"].startswith("inv_")
    assert body["data"]["status"] == "QUEUED"


@pytest.mark.asyncio
async def test_create_text_investigation_form(ac):
    resp = await ac.post(
        "/api/v1/investigations",
        data={"input_type": "text", "text": "Test claim about weather"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["investigation_id"].startswith("inv_")


# ── 3. Media upload validation ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_upload_valid_image(ac):
    resp = await ac.post(
        "/api/v1/investigations",
        files={"file": ("test.jpg", TINY_JPEG, "image/jpeg")},
        data={"text": ""},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["investigation_id"].startswith("inv_")


@pytest.mark.asyncio
async def test_upload_unsupported_type(ac):
    resp = await ac.post(
        "/api/v1/investigations",
        files={"file": ("test.exe", b"\x00" * 100, "application/octet-stream")},
        data={"text": ""},
    )
    assert resp.status_code == 400


# ── 4. Investigation ID generation ────────────────────────────────────────

@pytest.mark.asyncio
async def test_investigation_ids_are_unique(ac):
    ids = set()
    for i in range(5):
        resp = await ac.post(
            "/api/v1/investigations/json",
            json={"input_type": "text", "text": f"Claim {i}"},
        )
        assert resp.status_code == 200
        ids.add(resp.json()["data"]["investigation_id"])
    assert len(ids) == 5


# ── 5. Investigation persistence ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_investigation_persists(ac):
    resp = await ac.post(
        "/api/v1/investigations/json",
        json={"input_type": "text", "text": "Persistent claim"},
    )
    inv_id = resp.json()["data"]["investigation_id"]
    await asyncio.sleep(0.3)

    resp2 = await ac.get(f"/api/v1/investigations/{inv_id}")
    assert resp2.status_code == 200
    body = resp2.json()
    assert body["data"]["investigation_id"] == inv_id
    assert body["data"]["text"] == "Persistent claim"


# ── 6. Investigation retrieval ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_nonexistent_investigation(ac):
    resp = await ac.get("/api/v1/investigations/inv_nonexistent999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_investigation_includes_modules(ac):
    resp = await ac.post(
        "/api/v1/investigations/json",
        json={"input_type": "text", "text": "Module check"},
    )
    inv_id = resp.json()["data"]["investigation_id"]
    await asyncio.sleep(0.3)

    resp2 = await ac.get(f"/api/v1/investigations/{inv_id}")
    body = resp2.json()
    modules = body["data"]["modules"]
    assert "media_ai" in modules
    assert "claim_ai" in modules
    assert "network_ai" in modules
    assert "propagation" in modules


# ── 7. Investigation listing ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_investigations(ac):
    for text in ["First claim", "Second claim"]:
        await ac.post(
            "/api/v1/investigations/json",
            json={"input_type": "text", "text": text},
        )
    resp = await ac.get("/api/v1/investigations")
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert len(body["data"]) >= 2


# ── 8. Investigation state transitions ────────────────────────────────────

@pytest.mark.asyncio
async def test_investigation_transitions_from_queued(ac):
    resp = await ac.post(
        "/api/v1/investigations/json",
        json={"input_type": "text", "text": "State transition test"},
    )
    inv_id = resp.json()["data"]["investigation_id"]
    await asyncio.sleep(0.5)

    resp2 = await ac.get(f"/api/v1/investigations/{inv_id}/status")
    body = resp2.json()
    assert body["data"]["status"] in ("PROCESSING", "PARTIAL", "COMPLETED")


# ── 9. Module unavailable / not-applicable responses ──────────────────────

@pytest.mark.asyncio
async def test_text_investigation_media_not_applicable(ac):
    resp = await ac.post(
        "/api/v1/investigations/json",
        json={"input_type": "text", "text": "Text only"},
    )
    inv_id = resp.json()["data"]["investigation_id"]
    await asyncio.sleep(0.3)

    resp2 = await ac.get(f"/api/v1/investigations/{inv_id}/media")
    body = resp2.json()
    assert body["success"] is True
    assert body["data"]["status"] == "NOT_APPLICABLE"


@pytest.mark.asyncio
async def test_network_not_applicable_without_posts(ac):
    resp = await ac.post(
        "/api/v1/investigations/json",
        json={"input_type": "text", "text": "No posts"},
    )
    inv_id = resp.json()["data"]["investigation_id"]
    await asyncio.sleep(0.3)

    resp2 = await ac.get(f"/api/v1/investigations/{inv_id}/network")
    body = resp2.json()
    assert body["success"] is True
    assert body["data"]["status"] == "NOT_APPLICABLE"


@pytest.mark.asyncio
async def test_propagation_not_applicable_without_posts(ac):
    resp = await ac.post(
        "/api/v1/investigations/json",
        json={"input_type": "text", "text": "No propagation"},
    )
    inv_id = resp.json()["data"]["investigation_id"]
    await asyncio.sleep(0.3)

    resp2 = await ac.get(f"/api/v1/investigations/{inv_id}/propagation")
    body = resp2.json()
    assert body["success"] is True
    assert body["data"]["status"] == "NOT_APPLICABLE"


@pytest.mark.asyncio
async def test_claims_unavailable_in_stage1(ac):
    """Claims should be UNAVAILABLE (no model), not faked as COMPLETED."""
    resp = await ac.post(
        "/api/v1/investigations/json",
        json={"input_type": "text", "text": "Claim analysis test"},
    )
    inv_id = resp.json()["data"]["investigation_id"]
    await asyncio.sleep(0.5)

    resp2 = await ac.get(f"/api/v1/investigations/{inv_id}/claims")
    body = resp2.json()
    assert body["success"] is True
    assert body["data"]["status"] in ("UNAVAILABLE", "PENDING")


# ── 10. Invalid input handling ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_empty_text_rejected(ac):
    resp = await ac.post(
        "/api/v1/investigations/json",
        json={"input_type": "text", "text": ""},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_whitespace_text_rejected(ac):
    resp = await ac.post(
        "/api/v1/investigations/json",
        json={"input_type": "text", "text": "   "},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_media_type_via_json_rejected(ac):
    resp = await ac.post(
        "/api/v1/investigations/json",
        json={"input_type": "image", "text": "should fail"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_no_text_no_file_rejected(ac):
    resp = await ac.post("/api/v1/investigations", data={"text": ""})
    assert resp.status_code == 400


# ── 11. Rejecting oversized files ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_oversized_file_rejected(ac, monkeypatch):
    from backend import config
    monkeypatch.setattr(config, "MAX_UPLOAD_BYTES", 100)

    large_content = TINY_JPEG + b"\x00" * 200
    resp = await ac.post(
        "/api/v1/investigations",
        files={"file": ("big.jpg", large_content, "image/jpeg")},
        data={"text": ""},
    )
    assert resp.status_code == 400
