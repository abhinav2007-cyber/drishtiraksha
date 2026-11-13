"""DRISHTIRAKSHA — SQLite async database layer.

Provides investigation persistence, state transitions, module-status storage
and result storage.  Uses aiosqlite for non-blocking I/O.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

import aiosqlite

from backend import config
from backend.schemas import (
    Investigation,
    InvestigationCreate,
    InvestigationState,
    InvestigationSummary,
    InputType,
    ModuleStatus,
    ModuleStatusEnum,
    ModuleStatuses,
    _new_id,
    _now_utc,
)

logger = logging.getLogger(__name__)

_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS investigations (
    investigation_id  TEXT PRIMARY KEY,
    status            TEXT NOT NULL DEFAULT 'QUEUED',
    input_type        TEXT NOT NULL DEFAULT 'text',
    text              TEXT NOT NULL DEFAULT '',
    language_hint     TEXT,
    media_id          TEXT,
    media_filename    TEXT,
    media_path        TEXT,
    social_posts_json TEXT,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS module_statuses (
    investigation_id  TEXT NOT NULL,
    module_name       TEXT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'PENDING',
    error_json        TEXT,
    started_at        TEXT,
    completed_at      TEXT,
    PRIMARY KEY (investigation_id, module_name),
    FOREIGN KEY (investigation_id) REFERENCES investigations(investigation_id)
);

CREATE TABLE IF NOT EXISTS module_results (
    investigation_id  TEXT NOT NULL,
    module_name       TEXT NOT NULL,
    result_json       TEXT NOT NULL DEFAULT '{}',
    updated_at        TEXT NOT NULL,
    PRIMARY KEY (investigation_id, module_name),
    FOREIGN KEY (investigation_id) REFERENCES investigations(investigation_id)
);
"""

MODULE_NAMES = ("media_ai", "claim_ai", "network_ai", "propagation")


def _db_path() -> str:
    """Always read config.DATABASE_PATH at call time so monkeypatch works."""
    return str(config.DATABASE_PATH)


def _ts(dt: datetime) -> str:
    return dt.isoformat()


def _parse_ts(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value)


async def init_db() -> None:
    async with aiosqlite.connect(_db_path()) as db:
        await db.executescript(_SCHEMA_SQL)
        await db.commit()
    logger.info("Database initialized at %s", _db_path())


async def create_investigation(
    req: InvestigationCreate,
    *,
    media_id: str | None = None,
    media_filename: str | None = None,
    media_path: str | None = None,
) -> Investigation:
    now = _now_utc()
    inv = Investigation(
        investigation_id=_new_id("inv"),
        status=InvestigationState.QUEUED,
        input_type=req.input_type,
        text=req.text,
        language_hint=req.language_hint,
        media_id=media_id,
        media_filename=media_filename,
        media_path=media_path,
        created_at=now,
        updated_at=now,
    )

    has_posts = bool(req.social_posts and len(req.social_posts) > 0)
    modules = _initial_module_statuses(inv.input_type, has_posts=has_posts)
    inv.modules = modules

    social_json = json.dumps(req.social_posts) if req.social_posts else None

    async with aiosqlite.connect(_db_path()) as db:
        await db.execute(
            """INSERT INTO investigations
               (investigation_id, status, input_type, text, language_hint,
                media_id, media_filename, media_path, social_posts_json,
                created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                inv.investigation_id, inv.status.value, inv.input_type.value,
                inv.text, inv.language_hint, inv.media_id, inv.media_filename,
                inv.media_path, social_json, _ts(inv.created_at), _ts(inv.updated_at),
            ),
        )
        for name in MODULE_NAMES:
            ms: ModuleStatus = getattr(modules, name)
            await db.execute(
                """INSERT INTO module_statuses
                   (investigation_id, module_name, status)
                   VALUES (?, ?, ?)""",
                (inv.investigation_id, name, ms.status.value),
            )
        await db.commit()

    logger.info("Created investigation %s", inv.investigation_id)
    return inv


def _initial_module_statuses(input_type: InputType, has_posts: bool = False) -> ModuleStatuses:
    ms = ModuleStatuses()
    if input_type == InputType.TEXT:
        ms.media_ai = ModuleStatus(status=ModuleStatusEnum.NOT_APPLICABLE)
        ms.claim_ai = ModuleStatus(status=ModuleStatusEnum.PENDING)
    elif input_type in (InputType.IMAGE, InputType.AUDIO, InputType.VIDEO):
        ms.media_ai = ModuleStatus(status=ModuleStatusEnum.PENDING)
        ms.claim_ai = ModuleStatus(status=ModuleStatusEnum.PENDING)
    else:
        ms.media_ai = ModuleStatus(status=ModuleStatusEnum.NOT_APPLICABLE)
        ms.claim_ai = ModuleStatus(status=ModuleStatusEnum.PENDING)

    if has_posts:
        ms.network_ai = ModuleStatus(status=ModuleStatusEnum.PENDING)
        ms.propagation = ModuleStatus(status=ModuleStatusEnum.PENDING)
    else:
        ms.network_ai = ModuleStatus(status=ModuleStatusEnum.NOT_APPLICABLE)
        ms.propagation = ModuleStatus(status=ModuleStatusEnum.NOT_APPLICABLE)
    return ms


async def get_investigation_social_posts(investigation_id: str) -> list[dict[str, Any]] | None:
    """Retrieve raw social posts JSON for an investigation."""
    async with aiosqlite.connect(_db_path()) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT social_posts_json FROM investigations WHERE investigation_id = ?",
            (investigation_id,),
        )
        row = await cursor.fetchone()
        if not row or not row["social_posts_json"]:
            return None
        try:
            return json.loads(row["social_posts_json"])
        except Exception:
            return None


async def get_investigation(investigation_id: str) -> Investigation | None:
    async with aiosqlite.connect(_db_path()) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM investigations WHERE investigation_id = ?",
            (investigation_id,),
        )
        row = await cursor.fetchone()
        if not row:
            return None

        modules = ModuleStatuses()
        cursor2 = await db.execute(
            "SELECT * FROM module_statuses WHERE investigation_id = ?",
            (investigation_id,),
        )
        ms_rows = await cursor2.fetchall()
        for msr in ms_rows:
            ms = ModuleStatus(
                status=ModuleStatusEnum(msr["status"]),
                error=json.loads(msr["error_json"]) if msr["error_json"] else None,
                started_at=_parse_ts(msr["started_at"]),
                completed_at=_parse_ts(msr["completed_at"]),
            )
            if msr["module_name"] in MODULE_NAMES:
                setattr(modules, msr["module_name"], ms)

        return Investigation(
            investigation_id=row["investigation_id"],
            status=InvestigationState(row["status"]),
            input_type=InputType(row["input_type"]),
            text=row["text"],
            language_hint=row["language_hint"],
            media_id=row["media_id"],
            media_filename=row["media_filename"],
            media_path=row["media_path"],
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
            modules=modules,
        )


async def list_investigations(limit: int = 50, offset: int = 0) -> list[InvestigationSummary]:
    async with aiosqlite.connect(_db_path()) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT investigation_id, status, input_type, media_filename,
                      created_at, updated_at
               FROM investigations ORDER BY created_at DESC LIMIT ? OFFSET ?""",
            (limit, offset),
        )
        rows = await cursor.fetchall()
        return [
            InvestigationSummary(
                investigation_id=r["investigation_id"],
                status=InvestigationState(r["status"]),
                input_type=InputType(r["input_type"]),
                media_filename=r["media_filename"],
                created_at=datetime.fromisoformat(r["created_at"]),
                updated_at=datetime.fromisoformat(r["updated_at"]),
            )
            for r in rows
        ]


async def update_investigation_status(investigation_id: str, status: InvestigationState) -> None:
    now = _ts(_now_utc())
    async with aiosqlite.connect(_db_path()) as db:
        await db.execute(
            "UPDATE investigations SET status = ?, updated_at = ? WHERE investigation_id = ?",
            (status.value, now, investigation_id),
        )
        await db.commit()


async def update_module_status(
    investigation_id: str,
    module_name: str,
    status: ModuleStatusEnum,
    error_json: str | None = None,
) -> None:
    now = _ts(_now_utc())
    sets = ["status = ?"]
    vals: list = [status.value]
    if error_json is not None:
        sets.append("error_json = ?")
        vals.append(error_json)
    if status == ModuleStatusEnum.RUNNING:
        sets.append("started_at = ?")
        vals.append(now)
    if status in (ModuleStatusEnum.COMPLETED, ModuleStatusEnum.FAILED, ModuleStatusEnum.UNAVAILABLE):
        sets.append("completed_at = ?")
        vals.append(now)
    vals += [investigation_id, module_name]

    async with aiosqlite.connect(_db_path()) as db:
        await db.execute(
            f"UPDATE module_statuses SET {', '.join(sets)} "
            f"WHERE investigation_id = ? AND module_name = ?",
            vals,
        )
        await db.execute(
            "UPDATE investigations SET updated_at = ? WHERE investigation_id = ?",
            (now, investigation_id),
        )
        await db.commit()


async def store_module_result(investigation_id: str, module_name: str, result_json: str) -> None:
    now = _ts(_now_utc())
    async with aiosqlite.connect(_db_path()) as db:
        await db.execute(
            """INSERT INTO module_results (investigation_id, module_name, result_json, updated_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(investigation_id, module_name)
               DO UPDATE SET result_json = excluded.result_json, updated_at = excluded.updated_at""",
            (investigation_id, module_name, result_json, now),
        )
        await db.commit()


async def get_module_result(investigation_id: str, module_name: str) -> dict | None:
    async with aiosqlite.connect(_db_path()) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT result_json FROM module_results WHERE investigation_id = ? AND module_name = ?",
            (investigation_id, module_name),
        )
        row = await cursor.fetchone()
        if not row:
            return None
        return json.loads(row["result_json"])


async def get_stored_media_fingerprints(exclude_investigation_id: str | None = None) -> list[dict]:
    """Retrieve all previously computed media fingerprints for duplicate detection."""
    async with aiosqlite.connect(_db_path()) as db:
        db.row_factory = aiosqlite.Row
        query = "SELECT investigation_id, result_json FROM module_results WHERE module_name = 'media_ai'"
        params: tuple = ()
        if exclude_investigation_id:
            query += " AND investigation_id != ?"
            params = (exclude_investigation_id,)
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        items = []
        for r in rows:
            try:
                res = json.loads(r["result_json"])
                analysis = res.get("analysis", {})
                fp = analysis.get("fingerprint")
                if fp:
                    items.append({
                        "investigation_id": r["investigation_id"],
                        "media_id": res.get("media_id"),
                        "filename": res.get("filename"),
                        "sha256": fp.get("sha256"),
                        "perceptual_hash_average": fp.get("perceptual_hash_average"),
                        "perceptual_hash_difference": fp.get("perceptual_hash_difference"),
                        "perceptual_hash_perceptual": fp.get("perceptual_hash_perceptual"),
                    })
            except Exception:
                pass
        return items


async def recover_interrupted() -> None:
    async with aiosqlite.connect(_db_path()) as db:
        now = _ts(_now_utc())
        await db.execute(
            "UPDATE investigations SET status = ?, updated_at = ? WHERE status = ?",
            (InvestigationState.PARTIAL.value, now, InvestigationState.PROCESSING.value),
        )
        await db.execute(
            "UPDATE module_statuses SET status = ? WHERE status = ?",
            (ModuleStatusEnum.PENDING.value, ModuleStatusEnum.RUNNING.value),
        )
        await db.commit()
    logger.info("Recovered interrupted investigations on startup")
