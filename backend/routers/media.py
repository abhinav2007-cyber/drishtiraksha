"""Media analysis result endpoints."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend import database as db
from backend.schemas import APIResponse, MediaResult, ModuleStatusEnum

router = APIRouter()


@router.get("/investigations/{investigation_id}/media", response_model=APIResponse)
async def get_media_results(investigation_id: str):
    """Return media analysis results for an investigation."""
    inv = await db.get_investigation(investigation_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="Investigation not found")

    # If media_ai is NOT_APPLICABLE, say so clearly
    ms = inv.modules.media_ai
    if ms.status == ModuleStatusEnum.NOT_APPLICABLE:
        return APIResponse(
            success=True,
            data={
                "investigation_id": investigation_id,
                "status": "NOT_APPLICABLE",
                "reason": "This investigation does not include media input.",
            },
        )

    # Check for stored result
    stored = await db.get_module_result(investigation_id, "media_ai")
    if stored:
        return APIResponse(success=True, data=stored)

    # No result yet
    result = MediaResult(
        investigation_id=investigation_id,
        media_id=inv.media_id,
        media_type=inv.input_type.value if inv.input_type.value != "text" else None,
        filename=inv.media_filename,
    )
    result.analysis.deepfake_detection.status = ms.status
    if ms.status == ModuleStatusEnum.UNAVAILABLE:
        result.analysis.deepfake_detection.explanation = (
            "No deepfake detection model is loaded. "
            "Model integration is planned for a future stage."
        )

    return APIResponse(success=True, data=result.model_dump(mode="json"))


@router.get("/investigations/{investigation_id}/media/fingerprint", response_model=APIResponse)
async def get_media_fingerprint(investigation_id: str):
    """Return only the media fingerprint details (SHA-256 and perceptual hashes)."""
    inv = await db.get_investigation(investigation_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="Investigation not found")

    stored = await db.get_module_result(investigation_id, "media_ai")
    if not stored:
        return APIResponse(
            success=True,
            data={
                "investigation_id": investigation_id,
                "status": inv.modules.media_ai.status.value,
                "fingerprint": None,
            },
        )

    analysis = stored.get("analysis", {})
    return APIResponse(
        success=True,
        data={
            "investigation_id": investigation_id,
            "media_id": stored.get("media_id"),
            "fingerprint": analysis.get("fingerprint"),
        },
    )


@router.get("/investigations/{investigation_id}/media/duplicates", response_model=APIResponse)
async def get_media_duplicates(investigation_id: str):
    """Return duplicate and near-duplicate matching results."""
    inv = await db.get_investigation(investigation_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="Investigation not found")

    stored = await db.get_module_result(investigation_id, "media_ai")
    if not stored:
        return APIResponse(
            success=True,
            data={
                "investigation_id": investigation_id,
                "status": inv.modules.media_ai.status.value,
                "near_duplicates": [],
            },
        )

    analysis = stored.get("analysis", {})
    return APIResponse(
        success=True,
        data={
            "investigation_id": investigation_id,
            "media_id": stored.get("media_id"),
            "near_duplicates": analysis.get("near_duplicates", []),
        },
    )
