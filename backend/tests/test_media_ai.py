"""
Tests for Stage 3 MEDIA_AI:
1. Exact SHA-256 fingerprinting (consistency, uniqueness)
2. Perceptual hashing (aHash, dHash, pHash)
3. Near-duplicate detection (exact byte match, near perceptual match, distinct rejection)
4. Genuine HuggingFace Swin Transformer inference (model name, scores, confidence, latency)
5. Service coordinator integration and error handling
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import pytest

from backend.modules.media_ai.fingerprint import (
    compute_file_sha256,
    compute_sha256,
    compute_perceptual_hashes,
    find_near_duplicates,
    hamming_distance,
)
from backend.modules.media_ai.image_detector import analyze_image_file
from backend.modules.media_ai.service import process_media
from backend.schemas import ModuleStatusEnum


@pytest.fixture
def test_images(tmp_path: Path):
    """Generate deterministic synthetic test images for unit tests."""
    # Image A: A blue square with a red circle
    img_a = Image.new("RGB", (256, 256), color=(30, 60, 180))
    draw_a = ImageDraw.Draw(img_a)
    draw_a.ellipse((64, 64, 192, 192), fill=(220, 40, 40))
    path_a = tmp_path / "img_a.png"
    img_a.save(path_a, format="PNG")

    # Image A modified: Image A with subtle blur (near-duplicate)
    img_a_mod = img_a.filter(ImageFilter.GaussianBlur(radius=1.5))
    path_a_mod = tmp_path / "img_a_mod.png"
    img_a_mod.save(path_a_mod, format="PNG")

    # Image B: Distinct green gradient/pattern (different content)
    img_b = Image.new("RGB", (256, 256), color=(20, 160, 40))
    draw_b = ImageDraw.Draw(img_b)
    draw_b.rectangle((30, 30, 220, 80), fill=(240, 230, 40))
    path_b = tmp_path / "img_b.png"
    img_b.save(path_b, format="PNG")

    return {
        "path_a": path_a,
        "path_a_mod": path_a_mod,
        "path_b": path_b,
    }


def test_sha256_exact_and_unique(test_images):
    """SHA-256 must be byte-exact and change when bytes change."""
    hash_a1 = compute_file_sha256(test_images["path_a"])
    hash_a2 = compute_file_sha256(test_images["path_a"])
    hash_b = compute_file_sha256(test_images["path_b"])

    assert len(hash_a1) == 64
    assert hash_a1 == hash_a2
    assert hash_a1 != hash_b


def test_perceptual_hashes_computed(test_images):
    """Perceptual hashes (aHash, dHash, pHash) must be calculated correctly."""
    with Image.open(test_images["path_a"]) as img:
        hashes = compute_perceptual_hashes(img)

    assert "perceptual_hash_perceptual" in hashes
    assert "perceptual_hash_average" in hashes
    assert "perceptual_hash_difference" in hashes
    assert len(hashes["perceptual_hash_perceptual"]) == 16
    assert len(hashes["perceptual_hash_average"]) == 16
    assert len(hashes["perceptual_hash_difference"]) == 16


def test_near_duplicate_matching(test_images):
    """Near-duplicate detection must detect identical and subtly modified images while rejecting distinct images."""
    with Image.open(test_images["path_a"]) as img_a:
        fp_a = compute_perceptual_hashes(img_a)
    with Image.open(test_images["path_a_mod"]) as img_a_mod:
        fp_a_mod = compute_perceptual_hashes(img_a_mod)
    with Image.open(test_images["path_b"]) as img_b:
        fp_b = compute_perceptual_hashes(img_b)

    sha_a = compute_file_sha256(test_images["path_a"])
    sha_a_mod = compute_file_sha256(test_images["path_a_mod"])
    sha_b = compute_file_sha256(test_images["path_b"])

    reference_collection = [
        {
            "media_id": "med-001",
            "investigation_id": "inv-prior-001",
            "sha256": sha_a,
            "perceptual_hash_perceptual": fp_a["perceptual_hash_perceptual"],
            "perceptual_hash_average": fp_a["perceptual_hash_average"],
            "perceptual_hash_difference": fp_a["perceptual_hash_difference"],
        },
        {
            "media_id": "med-002",
            "investigation_id": "inv-prior-002",
            "sha256": sha_b,
            "perceptual_hash_perceptual": fp_b["perceptual_hash_perceptual"],
            "perceptual_hash_average": fp_b["perceptual_hash_average"],
            "perceptual_hash_difference": fp_b["perceptual_hash_difference"],
        },
    ]

    # 1. Query with exact copy of A
    matches_exact = find_near_duplicates(
        target_sha256=sha_a,
        target_hashes=fp_a,
        reference_collection=reference_collection,
    )
    assert len(matches_exact) >= 1
    assert matches_exact[0]["match_type"] == "EXACT_BYTE_MATCH"
    assert matches_exact[0]["reference_investigation_id"] == "inv-prior-001"
    assert matches_exact[0]["similarity_score"] == 1.0

    # 2. Query with subtly blurred A
    matches_mod = find_near_duplicates(
        target_sha256=sha_a_mod,
        target_hashes=fp_a_mod,
        reference_collection=reference_collection,
        max_hamming_threshold=10,
    )
    assert len(matches_mod) >= 1
    assert matches_mod[0]["reference_investigation_id"] == "inv-prior-001"
    assert matches_mod[0]["match_type"] in ("EXACT_PERCEPTUAL_MATCH", "NEAR_DUPLICATE")
    assert matches_mod[0]["distance"] <= 10

    # 3. Query with image B against reference containing only A
    matches_b_against_a = find_near_duplicates(
        target_sha256=sha_b,
        target_hashes=fp_b,
        reference_collection=[reference_collection[0]],
        max_hamming_threshold=10,
    )
    assert len(matches_b_against_a) == 0


def test_real_swin_transformer_inference(test_images):
    """Verify genuine Swin Transformer detector runs without crashing, returning valid metrics and raw scores."""
    result = analyze_image_file(test_images["path_a"])

    assert result["status"] == "COMPLETED"
    assert result["model_name"] == "umm-maybe/AI-image-detector"
    assert result["device"] in ("cpu", "cuda")
    assert result["prediction"] in ("LIKELY_REAL", "SUSPICIOUS_AI_GENERATED")
    assert 0.0 <= result["confidence"] <= 1.0
    assert result["inference_time_ms"] > 0
    assert "artificial" in result["raw_scores"]
    assert "human" in result["raw_scores"]
    assert abs((result["raw_scores"]["artificial"] + result["raw_scores"]["human"]) - 1.0) < 1e-3
    assert len(result["limitations"]) > 0


def test_process_media_service_orchestrator(test_images):
    """Verify full process_media service integration."""
    result = process_media(
        media_path=str(test_images["path_a"]),
        media_type="image",
        investigation_id="test-inv-999",
        filename="img_a.png",
    )

    assert result.investigation_id == "test-inv-999"
    assert result.media_type == "image"
    assert result.analysis is not None
    assert result.analysis.fingerprint is not None
    assert result.analysis.fingerprint.sha256 is not None
    assert len(result.analysis.fingerprint.sha256) == 64
    assert result.analysis.fingerprint.perceptual_hash_perceptual is not None
    assert result.analysis.deepfake_detection is not None
    assert result.analysis.deepfake_detection.model_name == "umm-maybe/AI-image-detector"
    assert result.analysis.deepfake_detection.status == ModuleStatusEnum.COMPLETED
    assert result.analysis.deepfake_detection.raw_scores is not None


def test_missing_image_path():
    """Missing file must raise FileNotFoundError."""
    with pytest.raises(FileNotFoundError):
        analyze_image_file(Path("non_existent_file.jpg"))
