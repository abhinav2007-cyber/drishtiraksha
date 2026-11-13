"""DRISHTIRAKSHA — Media AI Service Coordinator.

Coordinates genuine image AI inference, exact SHA-256 and perceptual hashing,
reference duplicate matching, and optional video frame sampling.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

from PIL import Image

from backend.modules.media_ai.audio_detector import analyze_audio_file
from backend.modules.media_ai.fingerprint import (
    compute_file_sha256,
    compute_perceptual_hashes,
    find_near_duplicates,
)
from backend.modules.media_ai.image_detector import analyze_image_file
from backend.schemas import (
    DeepfakeDetectionResult,
    FingerprintResult,
    MediaAnalysis,
    MediaResult,
    ModuleStatusEnum,
)

logger = logging.getLogger(__name__)


def process_media(
    media_path: str,
    media_type: str,
    investigation_id: str,
    media_id: str | None = None,
    filename: str | None = None,
    reference_fingerprints: list[dict[str, Any]] | None = None,
) -> MediaResult:
    """Execute real media analysis (image deepfake detection, hashing, video sampling)."""
    path_obj = Path(media_path)
    if not path_obj.exists():
        raise FileNotFoundError(f"Media file does not exist: {media_path}")

    file_size_bytes = os.path.getsize(path_obj)
    media_type = media_type.lower()

    # ─────────────────────────────────────────────────────────────────────────
    # 1. IMAGE PROCESSING
    # ─────────────────────────────────────────────────────────────────────────
    if media_type == "image":
        # A. Exact SHA-256 byte hash
        sha256_hash = compute_file_sha256(path_obj)

        # B. Perceptual hashes (aHash, dHash, pHash)
        try:
            with Image.open(path_obj) as img:
                perceptual_hashes = compute_perceptual_hashes(img)
        except Exception as exc:
            raise ValueError(f"Corrupt or unreadable image file: {exc}") from exc

        fingerprint_obj = FingerprintResult(
            sha256=sha256_hash,
            perceptual_hash_average=perceptual_hashes["perceptual_hash_average"],
            perceptual_hash_difference=perceptual_hashes["perceptual_hash_difference"],
            perceptual_hash_perceptual=perceptual_hashes["perceptual_hash_perceptual"],
        )

        # C. Near-duplicate matching against reference / historical fingerprints
        near_duplicates = []
        if reference_fingerprints:
            near_duplicates = find_near_duplicates(
                target_sha256=sha256_hash,
                target_hashes=perceptual_hashes,
                reference_collection=reference_fingerprints,
                max_hamming_threshold=10,
            )

        # D. Real Pretrained AI Model Inference (Swin Transformer)
        detection_data = analyze_image_file(path_obj)

        deepfake_obj = DeepfakeDetectionResult(
            status=ModuleStatusEnum.COMPLETED,
            model_name=detection_data["model_name"],
            model_version=detection_data["model_version"],
            prediction=detection_data["prediction"],
            confidence=detection_data["confidence"],
            explanation=detection_data["explanation"],
            device=detection_data["device"],
            inference_time_ms=detection_data["inference_time_ms"],
            raw_scores=detection_data["raw_scores"],
            limitations=detection_data["limitations"],
        )

        return MediaResult(
            media_id=media_id,
            investigation_id=investigation_id,
            media_type="image",
            filename=filename or path_obj.name,
            file_size_bytes=file_size_bytes,
            analysis=MediaAnalysis(
                deepfake_detection=deepfake_obj,
                fingerprint=fingerprint_obj,
                near_duplicates=near_duplicates,
            ),
        )

    # ─────────────────────────────────────────────────────────────────────────
    # 2. VIDEO PROCESSING (Sampled Frame Analysis)
    # ─────────────────────────────────────────────────────────────────────────
    elif media_type == "video":
        sha256_hash = compute_file_sha256(path_obj)

        # Extract frames using OpenCV
        import cv2

        cap = cv2.VideoCapture(str(path_obj))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 24.0

        if not cap.isOpened() or total_frames <= 0:
            cap.release()
            raise ValueError("Unable to open or decode video stream.")

        # Uniformly sample up to 5 representative frames
        sample_count = min(5, total_frames)
        step = max(1, total_frames // sample_count)

        frame_results = []
        sampled_indices = []
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            for i in range(sample_count):
                frame_idx = i * step
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()
                if not ret or frame is None:
                    continue

                frame_path = os.path.join(tmpdir, f"frame_{frame_idx}.jpg")
                cv2.imwrite(frame_path, frame)
                try:
                    f_res = analyze_image_file(frame_path)
                    frame_results.append({
                        "frame_index": frame_idx,
                        "timestamp_seconds": round(frame_idx / fps, 2),
                        "prediction": f_res["prediction"],
                        "confidence": f_res["confidence"],
                    })
                    sampled_indices.append(frame_idx)
                except Exception as e:
                    logger.warning("Error analyzing frame %d: %s", frame_idx, e)

        cap.release()

        # Aggregate sampled frame findings
        ai_count = sum(1 for f in frame_results if f["prediction"] == "SUSPICIOUS_AI_GENERATED")
        avg_conf = (
            sum(f["confidence"] for f in frame_results) / max(len(frame_results), 1)
            if frame_results
            else 0.0
        )

        if ai_count >= (len(frame_results) / 2):
            agg_pred = "SUSPICIOUS_AI_GENERATED_FRAMES"
        else:
            agg_pred = "LIKELY_REAL_SAMPLED_FRAMES"

        deepfake_obj = DeepfakeDetectionResult(
            status=ModuleStatusEnum.COMPLETED,
            model_name="umm-maybe/AI-image-detector (Frame-Sampled)",
            model_version="1.0",
            prediction=agg_pred,
            confidence=round(avg_conf, 4),
            explanation=(
                f"Evaluated {len(frame_results)} uniformly sampled frames from {total_frames} total video frames. "
                f"{ai_count}/{len(frame_results)} frames exhibited generative AI characteristics."
            ),
            limitations=[
                "Frame-sampling analysis only; does not perform temporal motion consistency or optical flow forensic checks.",
                "Audio track of video was not analyzed by the image model.",
                "May fail on face reenactments or deepfakes where only subtle subregions are manipulated.",
            ],
        )

        return MediaResult(
            media_id=media_id,
            investigation_id=investigation_id,
            media_type="video",
            filename=filename or path_obj.name,
            file_size_bytes=file_size_bytes,
            analysis=MediaAnalysis(
                deepfake_detection=deepfake_obj,
                fingerprint=FingerprintResult(sha256=sha256_hash),
                near_duplicates=[],
            ),
        )

    # ─────────────────────────────────────────────────────────────────────────
    # 3. AUDIO PROCESSING (Real Wav2Vec2 Synthetic Speech Detection)
    # ─────────────────────────────────────────────────────────────────────────
    elif media_type == "audio":
        sha256_hash = compute_file_sha256(path_obj)
        try:
            audio_res = analyze_audio_file(path_obj)
            deepfake_obj = DeepfakeDetectionResult(
                status=ModuleStatusEnum.COMPLETED,
                model_name=audio_res["model_name"],
                model_version=audio_res["model_version"],
                prediction=audio_res["prediction"],
                confidence=audio_res["confidence"],
                explanation=audio_res["explanation"],
                device=audio_res["device"],
                inference_time_ms=audio_res["inference_time_ms"],
                raw_scores=audio_res["raw_scores"],
                limitations=audio_res["limitations"],
            )
        except Exception as exc:
            logger.warning("Audio deepfake analysis failed on %s: %s", path_obj.name, exc)
            deepfake_obj = DeepfakeDetectionResult(
                status=ModuleStatusEnum.UNAVAILABLE,
                model_name="mo-thecreator/Deepfake-audio-detection",
                prediction=None,
                confidence=None,
                explanation=f"Audio analysis could not process file ({exc}). Only uncompressed WAV format is currently decoded.",
                limitations=["Audio format decoding failed or file is corrupted."],
            )

        return MediaResult(
            media_id=media_id,
            investigation_id=investigation_id,
            media_type="audio",
            filename=filename or path_obj.name,
            file_size_bytes=file_size_bytes,
            analysis=MediaAnalysis(
                deepfake_detection=deepfake_obj,
                fingerprint=FingerprintResult(sha256=sha256_hash),
                near_duplicates=[],
            ),
        )

    else:
        raise ValueError(f"Unsupported media type: '{media_type}'")
