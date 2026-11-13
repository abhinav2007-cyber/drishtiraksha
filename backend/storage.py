"""DRISHTIRAKSHA — Safe media upload handling.

Validates file extension, size, and magic bytes, then stores files with
collision-safe generated filenames that cannot escape the upload directory.
"""
from __future__ import annotations

import hashlib
import logging
from pathlib import Path, PurePosixPath
from uuid import uuid4

import aiofiles

from backend import config
from backend.config import (
    ALLOWED_EXTENSIONS,
    UPLOAD_DIR,
    media_type_for_extension,
)
from backend.schemas import _new_id

logger = logging.getLogger(__name__)

# ── magic-byte signatures ─────────────────────────────────────────────────

_MAGIC_BYTES: dict[str, list[bytes]] = {
    ".jpg":  [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    ".png":  [b"\x89PNG\r\n\x1a\n"],
    ".bmp":  [b"BM"],
    ".webp": [b"RIFF"],
    ".wav":  [b"RIFF"],
    ".mp3":  [b"\xff\xfb", b"\xff\xf3", b"\xff\xf2", b"ID3"],
    ".ogg":  [b"OggS"],
    ".flac": [b"fLaC"],
    ".m4a":  [b"\x00\x00\x00"],  # ftyp box — loose check
    ".mp4":  [b"\x00\x00\x00"],
    ".avi":  [b"RIFF"],
    ".mov":  [b"\x00\x00\x00"],
    ".webm": [b"\x1a\x45\xdf\xa3"],
    ".mkv":  [b"\x1a\x45\xdf\xa3"],
}


class UploadError(Exception):
    """Raised when an upload fails validation."""
    def __init__(self, message: str, code: str = "UPLOAD_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


def _safe_extension(filename: str) -> str:
    """Extract and validate the file extension from the original filename."""
    # Use only the basename to prevent path traversal
    basename = PurePosixPath(filename).name
    if not basename or basename.startswith("."):
        raise UploadError("Invalid filename", "INVALID_FILENAME")

    ext = Path(basename).suffix.lower()
    if not ext:
        raise UploadError("File has no extension", "NO_EXTENSION")
    if ext not in ALLOWED_EXTENSIONS:
        raise UploadError(
            f"Unsupported file type '{ext}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
            "UNSUPPORTED_TYPE",
        )
    return ext


def _check_magic(data: bytes, ext: str) -> bool:
    """Verify the file content starts with expected magic bytes."""
    sigs = _MAGIC_BYTES.get(ext, [])
    if not sigs:
        return True  # No signature to check — allow
    return any(data.startswith(sig) for sig in sigs)


async def save_upload(
    filename: str,
    content: bytes,
    investigation_id: str,
) -> tuple[str, str, str, int]:
    """Validate and save an uploaded file.

    Returns:
        (media_id, safe_filename, file_path_str, file_size_bytes)

    Raises:
        UploadError on validation failure.
    """
    # 1. Size check
    max_bytes = config.MAX_UPLOAD_BYTES
    if len(content) > max_bytes:
        raise UploadError(
            f"File too large ({len(content):,} bytes). "
            f"Maximum allowed: {max_bytes:,} bytes.",
            "FILE_TOO_LARGE",
        )
    if len(content) == 0:
        raise UploadError("Uploaded file is empty", "EMPTY_FILE")

    # 2. Extension check
    ext = _safe_extension(filename)

    # 3. Magic-byte check
    if not _check_magic(content, ext):
        raise UploadError(
            f"File content does not match extension '{ext}'. "
            "The file may be corrupted or incorrectly named.",
            "CONTENT_MISMATCH",
        )

    # 4. Generate safe filename
    media_id = _new_id("med")
    safe_name = f"{investigation_id}_{uuid4().hex[:8]}{ext}"
    file_path = UPLOAD_DIR / safe_name

    # 5. Ensure the resolved path is within UPLOAD_DIR (prevent traversal)
    resolved = file_path.resolve()
    if not str(resolved).startswith(str(UPLOAD_DIR.resolve())):
        raise UploadError("Path traversal detected", "PATH_TRAVERSAL")

    # 6. Write file
    async with aiofiles.open(resolved, "wb") as f:
        await f.write(content)

    logger.info("Saved upload: %s → %s (%d bytes)", filename, safe_name, len(content))
    return media_id, safe_name, str(resolved), len(content)


def compute_sha256(data: bytes) -> str:
    """Compute SHA-256 hex digest of raw bytes."""
    return hashlib.sha256(data).hexdigest()
