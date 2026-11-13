"""Network analysis result endpoints."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend import database as db
from backend.schemas import APIResponse, NetworkResult, ModuleStatusEnum

router = APIRouter()


@router.get("/investigations/{investigation_id}/network", response_model=APIResponse)
async def get_network_results(investigation_id: str):
    """Return network graph and coordination detection results."""
    inv = await db.get_investigation(investigation_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="Investigation not found")

    ms = inv.modules.network_ai
    if ms.status == ModuleStatusEnum.NOT_APPLICABLE:
        return APIResponse(
            success=True,
            data={
                "investigation_id": investigation_id,
                "status": "NOT_APPLICABLE",
                "reason": (
                    "Network analysis requires social-post records. "
                    "No post records were supplied for this investigation."
                ),
            },
        )

    stored = await db.get_module_result(investigation_id, "network_ai")
    if stored:
        return APIResponse(success=True, data=stored)

    result = NetworkResult(investigation_id=investigation_id, status=ms.status)
    return APIResponse(success=True, data=result.model_dump(mode="json"))
