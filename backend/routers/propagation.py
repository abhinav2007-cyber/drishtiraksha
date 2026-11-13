"""Propagation timeline result endpoints."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend import database as db
from backend.schemas import APIResponse, PropagationResult, ModuleStatusEnum

router = APIRouter()


@router.get(
    "/investigations/{investigation_id}/propagation", response_model=APIResponse
)
async def get_propagation_results(investigation_id: str, claim_id: str | None = None):
    """Return propagation timeline and observed repost links."""
    inv = await db.get_investigation(investigation_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="Investigation not found")

    ms = inv.modules.propagation
    if ms.status == ModuleStatusEnum.NOT_APPLICABLE:
        return APIResponse(
            success=True,
            data={
                "investigation_id": investigation_id,
                "status": "NOT_APPLICABLE",
                "reason": (
                    "Propagation analysis requires social-post records. "
                    "No post records were supplied for this investigation."
                ),
            },
        )

    stored = await db.get_module_result(investigation_id, "propagation")
    if stored:
        return APIResponse(success=True, data=stored)

    result = PropagationResult(investigation_id=investigation_id, status=ms.status)
    return APIResponse(success=True, data=result.model_dump(mode="json"))
