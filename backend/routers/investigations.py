"""Investigation CRUD endpoints."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional

from backend import database as db
from backend.orchestrator import enqueue_investigation
from backend.schemas import (
    APIResponse,
    InputType,
    Investigation,
    InvestigationCreate,
    InvestigationStatusResponse,
    InvestigationSummary,
)
from backend.storage import UploadError, save_upload
from backend.config import media_type_for_extension

import os

router = APIRouter()


@router.post("/investigations", response_model=APIResponse)
async def create_investigation(
    # JSON body fields (used for text submissions)
    input_type: Optional[str] = Form(None),
    text: Optional[str] = Form(None),
    language_hint: Optional[str] = Form(None),
    social_posts: Optional[str] = Form(None),
    # File upload (used for media submissions)
    file: Optional[UploadFile] = File(None),
):
    """Create a new investigation from text (form fields) or media upload."""
    import json

    # Determine input type
    if file is not None and file.filename:
        # Media upload
        ext = os.path.splitext(file.filename)[1].lower()
        detected_type = media_type_for_extension(ext)
        if detected_type is None:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{ext}'.",
            )
        actual_input_type = InputType(detected_type)

        content = await file.read()
        try:
            media_id, safe_name, file_path, file_size = await save_upload(
                file.filename, content, "pending"
            )
        except UploadError as e:
            raise HTTPException(status_code=400, detail=e.message)

        # Parse optional social posts
        parsed_posts = None
        if social_posts:
            try:
                parsed_posts = json.loads(social_posts)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid social_posts JSON")

        req = InvestigationCreate(
            input_type=actual_input_type,
            text=text or "",
            language_hint=language_hint,
            social_posts=parsed_posts,
        )

        inv = await db.create_investigation(
            req,
            media_id=media_id,
            media_filename=safe_name,
            media_path=file_path,
        )

        # Rename file with real investigation_id
        import shutil
        new_name = file_path.replace("pending_", f"{inv.investigation_id}_")
        if file_path != new_name and os.path.exists(file_path):
            shutil.move(file_path, new_name)
            await _update_media_path(inv.investigation_id, new_name)

    else:
        # Text submission
        if not text or not text.strip():
            raise HTTPException(
                status_code=400,
                detail="Either 'text' or a file upload is required.",
            )

        actual_input_type = InputType(input_type) if input_type and input_type in [e.value for e in InputType] else InputType.TEXT

        parsed_posts = None
        if social_posts:
            try:
                parsed_posts = json.loads(social_posts)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid social_posts JSON")

        req = InvestigationCreate(
            input_type=actual_input_type,
            text=text.strip(),
            language_hint=language_hint,
            social_posts=parsed_posts,
        )
        inv = await db.create_investigation(req)

    # Enqueue for background processing
    await enqueue_investigation(inv.investigation_id)

    return APIResponse(
        success=True,
        data={
            "investigation_id": inv.investigation_id,
            "status": inv.status.value,
            "created_at": inv.created_at.isoformat(),
        },
    )


@router.post("/investigations/json", response_model=APIResponse)
async def create_investigation_json(req: InvestigationCreate):
    """Create a text investigation from a JSON body (convenience endpoint)."""
    if req.input_type != InputType.TEXT:
        raise HTTPException(
            status_code=400,
            detail="Use multipart form upload for media investigations.",
        )
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="'text' is required.")

    inv = await db.create_investigation(req)
    await enqueue_investigation(inv.investigation_id)

    return APIResponse(
        success=True,
        data={
            "investigation_id": inv.investigation_id,
            "status": inv.status.value,
            "created_at": inv.created_at.isoformat(),
        },
    )


@router.get("/investigations", response_model=APIResponse)
async def list_investigations(limit: int = 50, offset: int = 0):
    """List all investigations, newest first."""
    items = await db.list_investigations(limit=min(limit, 100), offset=max(offset, 0))
    return APIResponse(
        success=True,
        data=[item.model_dump(mode="json") for item in items],
    )


@router.get("/investigations/{investigation_id}", response_model=APIResponse)
async def get_investigation(investigation_id: str):
    """Get full investigation details including all module statuses."""
    inv = await db.get_investigation(investigation_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return APIResponse(success=True, data=inv.model_dump(mode="json"))


@router.get("/investigations/{investigation_id}/status", response_model=APIResponse)
async def get_investigation_status(investigation_id: str):
    """Lightweight status poll endpoint."""
    inv = await db.get_investigation(investigation_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="Investigation not found")
    resp = InvestigationStatusResponse(
        investigation_id=inv.investigation_id,
        status=inv.status,
        modules=inv.modules,
        updated_at=inv.updated_at,
    )
    return APIResponse(success=True, data=resp.model_dump(mode="json"))


async def _update_media_path(investigation_id: str, new_path: str) -> None:
    """Update the media path after renaming the uploaded file."""
    import aiosqlite
    from backend import config
    from backend.schemas import _now_utc

    async with aiosqlite.connect(str(config.DATABASE_PATH)) as conn:
        await conn.execute(
            "UPDATE investigations SET media_path = ?, updated_at = ? WHERE investigation_id = ?",
            (new_path, _now_utc().isoformat(), investigation_id),
        )
        await conn.commit()
