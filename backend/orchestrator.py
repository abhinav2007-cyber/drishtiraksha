"""DRISHTIRAKSHA — Investigation processing orchestrator.

Manages the lifecycle of an investigation: dispatching module processing
as background tasks, updating statuses, and computing the aggregate state.

Stage 1: No actual AI inference — PENDING modules become UNAVAILABLE.
"""
from __future__ import annotations

import asyncio
import logging

from backend import database as db
from backend.schemas import InvestigationState, ModuleStatusEnum

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

        # Stage 1: mark PENDING modules UNAVAILABLE (no models loaded)
        for name in db.MODULE_NAMES:
            ms = getattr(inv.modules, name)
            if ms.status == ModuleStatusEnum.PENDING:
                await db.update_module_status(
                    investigation_id, name, ModuleStatusEnum.UNAVAILABLE
                )

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
        return InvestigationState.PARTIAL  # All unavailable in Stage 1
