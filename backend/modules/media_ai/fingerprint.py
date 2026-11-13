"""DRISHTIRAKSHA — Media Fingerprinting & Duplicate Detection (MEDIA_AI).

Computes exact SHA-256 byte digests and perceptual hashes (aHash, dHash, pHash)
using ImageHash. Compares against reference databases or prior investigations.
"""
from __future__ import annotations

import hashlib
import logging
from pathlib import Path
from typing import Any

import imagehash
from PIL import Image

logger = logging.getLogger(__name__)


def compute_sha256(data: bytes) -> str:
    """Compute exact SHA-256 hex digest from raw media bytes."""
    return hashlib.sha256(data).hexdigest()


def compute_file_sha256(file_path: str | Path) -> str:
    """Compute SHA-256 hex digest by reading file in chunks."""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def compute_perceptual_hashes(img: Image.Image) -> dict[str, str]:
    """Compute perceptual image fingerprints across multiple algorithms.

    - aHash (Average Hash): High-frequency reduction; resilient to minor noise.
    - dHash (Difference Hash): Track horizontal gradient differences; fast and robust.
    - pHash (Perceptual Hash): Discrete Cosine Transform (DCT); highly resilient to scaling/color shifts.
    """
    # Ensure RGB conversion for uniform hash calculation
    rgb_img = img.convert("RGB") if img.mode != "RGB" else img
    ahash = str(imagehash.average_hash(rgb_img))
    dhash = str(imagehash.dhash(rgb_img))
    phash = str(imagehash.phash(rgb_img))

    return {
        "perceptual_hash_average": ahash,
        "perceptual_hash_difference": dhash,
        "perceptual_hash_perceptual": phash,
    }


def hamming_distance(hex_hash1: str, hex_hash2: str) -> int:
    """Calculate the bit-level Hamming distance between two hex-encoded image hashes."""
    if not hex_hash1 or not hex_hash2:
        return 64
    try:
        h1 = imagehash.hex_to_hash(hex_hash1)
        h2 = imagehash.hex_to_hash(hex_hash2)
        return int(h1 - h2)
    except Exception:
        return 64


def find_near_duplicates(
    target_sha256: str,
    target_hashes: dict[str, str],
    reference_collection: list[dict[str, Any]],
    max_hamming_threshold: int = 10,
) -> list[dict[str, Any]]:
    """Compare target fingerprints against a collection of reference/prior media.

    Returns matches distinguishing:
    - EXACT_BYTE_MATCH (identical SHA-256)
    - EXACT_PERCEPTUAL_MATCH (Hamming distance == 0)
    - NEAR_DUPLICATE (Hamming distance <= max_hamming_threshold)
    """
    matches: list[dict[str, Any]] = []

    for ref in reference_collection:
        ref_id = ref.get("media_id") or ref.get("id") or "ref_unknown"
        ref_inv_id = ref.get("investigation_id")
        ref_sha256 = ref.get("sha256")
        ref_ahash = ref.get("perceptual_hash_average")
        ref_dhash = ref.get("perceptual_hash_difference")
        ref_phash = ref.get("perceptual_hash_perceptual")

        # 1. Exact SHA-256 match
        if ref_sha256 and target_sha256 and ref_sha256.lower() == target_sha256.lower():
            matches.append({
                "reference_media_id": ref_id,
                "reference_investigation_id": ref_inv_id,
                "match_type": "EXACT_BYTE_MATCH",
                "similarity_score": 1.0,
                "distance": 0,
                "explanation": "Identical SHA-256 cryptographic checksum. The file bytes are identical.",
            })
            continue

        # 2. Perceptual comparison (using dHash and aHash)
        dist_d = hamming_distance(target_hashes.get("perceptual_hash_difference", ""), ref_dhash or "")
        dist_a = hamming_distance(target_hashes.get("perceptual_hash_average", ""), ref_ahash or "")
        dist_p = hamming_distance(target_hashes.get("perceptual_hash_perceptual", ""), ref_phash or "")

        min_dist = min(dist_d, dist_a, dist_p)

        if min_dist <= max_hamming_threshold:
            # 64 bits total in standard 8x8 hash
            similarity = round(max(0.0, 1.0 - (min_dist / 64.0)), 4)
            match_type = "EXACT_PERCEPTUAL_MATCH" if min_dist == 0 else "NEAR_DUPLICATE"

            matches.append({
                "reference_media_id": ref_id,
                "reference_investigation_id": ref_inv_id,
                "match_type": match_type,
                "similarity_score": similarity,
                "distance": min_dist,
                "explanation": (
                    f"{match_type.replace('_', ' ').capitalize()} with Hamming distance {min_dist} bits. "
                    "Indicates identical or visually similar image content (resized, re-encoded, or slight crop)."
                ),
            })

    return matches
