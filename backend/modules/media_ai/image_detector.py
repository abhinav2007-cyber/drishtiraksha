"""DRISHTIRAKSHA — Genuine Image Deepfake & Synthetic Imagery Detector (MEDIA_AI).

Uses the pretrained Vision/Swin Transformer model `umm-maybe/AI-image-detector`
to evaluate visual frequency patterns and token correlations indicative of generative AI.

Performs genuine inference on actual image bytes; caches model weights in memory.
"""
from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any

import torch
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

# Global cached pipeline to avoid re-initializing weights per request
_CLASSIFIER_PIPELINE = None
MODEL_ID = "umm-maybe/AI-image-detector"
MODEL_VERSION = "1.0 (Swin Transformer)"
ARCHITECTURE = "SwinForImageClassification"


def get_device() -> str:
    """Return 'cuda' if GPU is available and enabled, else 'cpu'."""
    return "cuda" if torch.cuda.is_available() else "cpu"


def load_image_classifier():
    """Load or return the cached Hugging Face image classification pipeline."""
    global _CLASSIFIER_PIPELINE
    if _CLASSIFIER_PIPELINE is not None:
        return _CLASSIFIER_PIPELINE

    device = get_device()
    device_idx = 0 if device == "cuda" else -1
    logger.info("Initializing image classification pipeline '%s' on %s ...", MODEL_ID, device)

    from transformers import pipeline

    _CLASSIFIER_PIPELINE = pipeline(
        "image-classification",
        model=MODEL_ID,
        device=device_idx,
    )
    logger.info("Image classifier loaded successfully.")
    return _CLASSIFIER_PIPELINE


def analyze_image_file(image_path: str | Path) -> dict[str, Any]:
    """Execute real pretrained model inference on a saved image file.

    Returns structured output containing:
    - prediction: LIKELY_REAL or SUSPICIOUS_AI_GENERATED
    - confidence: float score in [0.0, 1.0]
    - raw_scores: map of raw model probabilities
    - inference_time_ms: measured duration in milliseconds
    - device: 'cpu' or 'cuda'
    - model metadata and honest forensic limitations
    """
    path_obj = Path(image_path)
    if not path_obj.exists():
        raise FileNotFoundError(f"Image file does not exist: {image_path}")

    # Validate image decoding
    try:
        with Image.open(path_obj) as raw_img:
            # Transpose based on EXIF orientation if present, convert to RGB
            img = ImageOps.exif_transpose(raw_img)
            img = img.convert("RGB")
    except Exception as exc:
        raise ValueError(f"Failed to decode image file {path_obj.name}: {exc}") from exc

    # Load model and measure inference time
    classifier = load_image_classifier()
    device = get_device()

    t_start = time.perf_counter()
    raw_results = classifier(img)
    t_end = time.perf_counter()
    inference_time_ms = round((t_end - t_start) * 1000.0, 2)

    # Process raw classification outputs
    # Model labels: 'artificial', 'human'
    raw_scores: dict[str, float] = {}
    for item in raw_results:
        label = item["label"].lower()
        score = float(item["score"])
        raw_scores[label] = round(score, 4)

    artificial_score = raw_scores.get("artificial", 0.0)
    human_score = raw_scores.get("human", 0.0)

    # Output interpretation semantics
    if artificial_score >= 0.5:
        prediction = "SUSPICIOUS_AI_GENERATED"
        confidence = artificial_score
        explanation = (
            f"Model detected synthetic generation artifacts with {artificial_score*100:.1f}% confidence. "
            "Visual features and frequency distributions correlate with generative AI synthesis (e.g. Diffusion / GAN models)."
        )
    else:
        prediction = "LIKELY_REAL"
        confidence = human_score
        explanation = (
            f"Model assessed the image as organic / authentic photographic imagery with {human_score*100:.1f}% confidence. "
            "No pervasive generative-diffusion artifacts were detected."
        )

    limitations = [
        "Evaluates global synthetic patterns; does not detect localized facial swaps or manual photo editing.",
        "Scores represent statistical model feature correlation, not mathematically verified proof of authenticity.",
        "Classifier accuracy may degrade on heavily re-compressed, downsampled, or adversarial images.",
        "Does not identify specific generator families or verify source provenance.",
    ]

    return {
        "status": "COMPLETED",
        "model_name": MODEL_ID,
        "model_version": MODEL_VERSION,
        "architecture": ARCHITECTURE,
        "prediction": prediction,
        "confidence": round(confidence, 4),
        "explanation": explanation,
        "device": device,
        "inference_time_ms": inference_time_ms,
        "raw_scores": raw_scores,
        "limitations": limitations,
    }
