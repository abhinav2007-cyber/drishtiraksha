"""DRISHTIRAKSHA — Investigation processing orchestrator.

Manages the lifecycle of an investigation: dispatching module processing
as background tasks, updating statuses, and computing the aggregate state.
"""
from __future__ import annotations

import asyncio
import logging

from backend import database as db
from backend.modules.claim_ai.service import process_text_claims
from backend.modules.media_ai.service import process_media
from backend.modules.network_ai.service import analyze_network, analyze_propagation
from backend.schemas import (
    InvestigationState,
    ModuleStatusEnum,
    ProcessingError,
)

logger = logging.getLogger(__name__)

_active_tasks: dict[str, asyncio.Task] = {}
MAX_CONCURRENT = 3


async def enqueue_investigation(investigation_id: str) -> None:
    _cleanup()
    if len(_active_tasks) >= MAX_CONCURRENT:
        logger.warning("Max concurrent reached; %s stays QUEUED.", investigation_id)
        return
    task = asyncio.create_task(_process(investigation_id))
    _active_tasks[investigation_id] = task


def _cleanup() -> None:
    for k in [k for k, t in _active_tasks.items() if t.done()]:
        del _active_tasks[k]


async def _process(investigation_id: str) -> None:
    try:
        await db.update_investigation_status(investigation_id, InvestigationState.PROCESSING)
        inv = await db.get_investigation(investigation_id)
        if inv is None:
            logger.error("Investigation %s vanished", investigation_id)
            return

        # ─────────────────────────────────────────────────────────────────────
        # 1. MEDIA_AI Processing (Genuine Pretrained Image & Video Inference)
        # ─────────────────────────────────────────────────────────────────────
        if inv.modules.media_ai.status == ModuleStatusEnum.PENDING and inv.media_path:
            await db.update_module_status(investigation_id, "media_ai", ModuleStatusEnum.RUNNING)
            try:
                # Retrieve stored reference fingerprints to detect media reuse
                ref_fps = await db.get_stored_media_fingerprints(
                    exclude_investigation_id=investigation_id
                )

                # Run inference in a thread to keep the async event loop responsive
                media_res = await asyncio.to_thread(
                    process_media,
                    media_path=inv.media_path,
                    media_type=inv.input_type.value,
                    investigation_id=investigation_id,
                    media_id=inv.media_id,
                    filename=inv.media_filename,
                    reference_fingerprints=ref_fps,
                )

                # Persist result
                await db.store_module_result(
                    investigation_id, "media_ai", media_res.model_dump_json()
                )

                # Set module status from detection status (COMPLETED or UNAVAILABLE)
                status_to_set = media_res.analysis.deepfake_detection.status
                await db.update_module_status(
                    investigation_id, "media_ai", status_to_set
                )
            except Exception as e:
                logger.exception("MEDIA_AI failed for %s", investigation_id)
                err = ProcessingError(code="MEDIA_AI_ERROR", message=str(e))
                await db.update_module_status(
                    investigation_id,
                    "media_ai",
                    ModuleStatusEnum.FAILED,
                    error_json=err.model_dump_json(),
                )

        # ─────────────────────────────────────────────────────────────────────
        # 2. CLAIM_AI Processing (Multilingual Extraction & Verification)
        # ─────────────────────────────────────────────────────────────────────
        if inv.modules.claim_ai.status == ModuleStatusEnum.PENDING and inv.text:
            await db.update_module_status(investigation_id, "claim_ai", ModuleStatusEnum.RUNNING)
            try:
                claim_res = await asyncio.to_thread(
                    process_text_claims,
                    text=inv.text,
                    investigation_id=investigation_id,
                    language_hint=inv.language_hint,
                )
                await db.store_module_result(
                    investigation_id, "claim_ai", claim_res.model_dump_json()
                )
                await db.update_module_status(
                    investigation_id, "claim_ai", claim_res.status
                )
            except Exception as e:
                logger.exception("CLAIM_AI failed for %s", investigation_id)
                err = ProcessingError(code="CLAIM_AI_ERROR", message=str(e))
                await db.update_module_status(
                    investigation_id,
                    "claim_ai",
                    ModuleStatusEnum.FAILED,
                    error_json=err.model_dump_json(),
                )

        # ─────────────────────────────────────────────────────────────────────
        # 3. NETWORK_AI & PROPAGATION (Live Input-Driven Analysis)
        # ─────────────────────────────────────────────────────────────────────
        posts = await db.get_investigation_social_posts(investigation_id)

        # A. NETWORK_AI
        if inv.modules.network_ai.status == ModuleStatusEnum.PENDING:
            if posts and len(posts) > 0:
                await db.update_module_status(investigation_id, "network_ai", ModuleStatusEnum.RUNNING)
                try:
                    net_res = await asyncio.to_thread(
                        analyze_network,
                        posts=posts,
                        investigation_id=investigation_id,
                    )
                    await db.store_module_result(
                        investigation_id, "network_ai", net_res.model_dump_json()
                    )
                    await db.update_module_status(
                        investigation_id, "network_ai", net_res.status
                    )
                except Exception as e:
                    logger.exception("NETWORK_AI failed for %s", investigation_id)
                    err = ProcessingError(code="NETWORK_AI_ERROR", message=str(e))
                    await db.update_module_status(
                        investigation_id, "network_ai", ModuleStatusEnum.FAILED, error_json=err.model_dump_json()
                    )
            else:
                await db.update_module_status(
                    investigation_id, "network_ai", ModuleStatusEnum.NOT_APPLICABLE
                )

        # B. PROPAGATION
        if inv.modules.propagation.status == ModuleStatusEnum.PENDING:
            if posts and len(posts) > 0:
                await db.update_module_status(investigation_id, "propagation", ModuleStatusEnum.RUNNING)
                try:
                    prop_res = await asyncio.to_thread(
                        analyze_propagation,
                        posts=posts,
                        investigation_id=investigation_id,
                    )
                    await db.store_module_result(
                        investigation_id, "propagation", prop_res.model_dump_json()
                    )
                    await db.update_module_status(
                        investigation_id, "propagation", prop_res.status
                    )
                except Exception as e:
                    logger.exception("PROPAGATION failed for %s", investigation_id)
                    err = ProcessingError(code="PROPAGATION_ERROR", message=str(e))
                    await db.update_module_status(
                        investigation_id, "propagation", ModuleStatusEnum.FAILED, error_json=err.model_dump_json()
                    )
            else:
                await db.update_module_status(
                    investigation_id, "propagation", ModuleStatusEnum.NOT_APPLICABLE
                )

        # ─────────────────────────────────────────────────────────────────────
        # 4. Aggregate top-level investigation status
        # ─────────────────────────────────────────────────────────────────────
        final = await _aggregate(investigation_id)
        await db.update_investigation_status(investigation_id, final)
        logger.info("Investigation %s → %s", investigation_id, final.value)
    except Exception:
        logger.exception("Error processing %s", investigation_id)
        try:
            await db.update_investigation_status(investigation_id, InvestigationState.FAILED)
        except Exception:
            logger.exception("Failed to mark %s FAILED", investigation_id)


async def _aggregate(investigation_id: str) -> InvestigationState:
    inv = await db.get_investigation(investigation_id)
    if inv is None:
        return InvestigationState.FAILED

    statuses = [getattr(inv.modules, n).status for n in db.MODULE_NAMES]
    applicable = [s for s in statuses if s != ModuleStatusEnum.NOT_APPLICABLE]

    if not applicable:
        return InvestigationState.COMPLETED
    if any(s in (ModuleStatusEnum.RUNNING, ModuleStatusEnum.PENDING) for s in applicable):
        return InvestigationState.PROCESSING

    completed = sum(1 for s in applicable if s == ModuleStatusEnum.COMPLETED)
    if completed == len(applicable):
        return InvestigationState.COMPLETED
    elif completed > 0:
        return InvestigationState.PARTIAL
    else:
        return InvestigationState.PARTIAL  # All unavailable/partial
