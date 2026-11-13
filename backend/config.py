"""DRISHTIRAKSHA — Application configuration and settings."""
from __future__ import annotations

import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BACKEND_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

DATABASE_PATH = BACKEND_DIR / os.getenv("DATABASE_PATH", "drishtiraksha.db")

# ---------------------------------------------------------------------------
# Server
# ---------------------------------------------------------------------------
BACKEND_HOST: str = os.getenv("BACKEND_HOST", "127.0.0.1")
BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
_default_cors = "http://localhost:3000,http://127.0.0.1:3000,http://10.117.65.187:3000"
CORS_ORIGINS: list[str] = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", _default_cors).split(",")
    if o.strip()
]

# ---------------------------------------------------------------------------
# Upload limits
# ---------------------------------------------------------------------------
MAX_UPLOAD_BYTES: int = int(os.getenv("MAX_UPLOAD_BYTES", str(50 * 1024 * 1024)))  # 50 MB

ALLOWED_IMAGE_EXTENSIONS: set[str] = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
ALLOWED_AUDIO_EXTENSIONS: set[str] = {".wav", ".mp3", ".ogg", ".flac", ".m4a"}
ALLOWED_VIDEO_EXTENSIONS: set[str] = {".mp4", ".avi", ".mov", ".webm", ".mkv"}
ALLOWED_EXTENSIONS: set[str] = (
    ALLOWED_IMAGE_EXTENSIONS | ALLOWED_AUDIO_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS
)

# Map extensions to media categories
def media_type_for_extension(ext: str) -> str | None:
    """Return 'image', 'audio', or 'video' for a supported extension, else None."""
    ext = ext.lower()
    if ext in ALLOWED_IMAGE_EXTENSIONS:
        return "image"
    if ext in ALLOWED_AUDIO_EXTENSIONS:
        return "audio"
    if ext in ALLOWED_VIDEO_EXTENSIONS:
        return "video"
    return None

# ---------------------------------------------------------------------------
# Evidence / API keys
# ---------------------------------------------------------------------------
GOOGLE_FACT_CHECK_API_KEY: str = os.getenv("GOOGLE_FACT_CHECK_API_KEY", "")

# ---------------------------------------------------------------------------
# AI / Device
# ---------------------------------------------------------------------------
DEVICE: str = os.getenv("DEVICE", "cpu")
