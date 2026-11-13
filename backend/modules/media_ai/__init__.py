"""MEDIA_AI module — Image/Audio/Video deepfake detection, media fingerprinting, and provenance."""

from backend.modules.media_ai.fingerprint import (
    compute_sha256,
    compute_file_sha256,
    compute_perceptual_hashes,
    find_near_duplicates,
    hamming_distance,
)
from backend.modules.media_ai.image_detector import (
    analyze_image_file,
    load_image_classifier,
)
from backend.modules.media_ai.service import process_media

__all__ = [
    "compute_sha256",
    "compute_file_sha256",
    "compute_perceptual_hashes",
    "find_near_duplicates",
    "hamming_distance",
    "analyze_image_file",
    "load_image_classifier",
    "process_media",
]
