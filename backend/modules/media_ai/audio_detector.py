"""DRISHTIRAKSHA — Genuine Audio Deepfake & Synthetic Speech Detector (MEDIA_AI).

Uses the pretrained `mo-thecreator/Deepfake-audio-detection` checkpoint based on
fine-tuned Wav2Vec2 architecture (`Wav2Vec2ForSequenceClassification`).
Evaluates acoustic representations to detect artificial / synthesized speech.
"""
from __future__ import annotations

import logging
import os
import time
from pathlib import Path
from typing import Any

import numpy as np
import scipy.io.wavfile as wavfile
import torch
from transformers import AutoFeatureExtractor, Wav2Vec2ForSequenceClassification

logger = logging.getLogger(__name__)

MODEL_ID = "mo-thecreator/Deepfake-audio-detection"
MODEL_VERSION = "1.0 (Wav2Vec2)"
ARCHITECTURE = "Wav2Vec2ForSequenceClassification"

_FEATURE_EXTRACTOR = None
_MODEL = None


LOCAL_MODEL_DIR = Path(
    r"C:\Users\D.Harsh Rao\.cache\huggingface\hub\models--mo-thecreator--Deepfake-audio-detection\snapshots\main"
)


def get_device() -> str:
    return "cuda" if torch.cuda.is_available() else "cpu"


def load_audio_classifier():
    """Load or return the cached Wav2Vec2 synthetic audio classification model."""
    global _FEATURE_EXTRACTOR, _MODEL
    if _FEATURE_EXTRACTOR is not None and _MODEL is not None:
        return _FEATURE_EXTRACTOR, _MODEL

    device = get_device()
    target_path = str(LOCAL_MODEL_DIR) if LOCAL_MODEL_DIR.exists() else MODEL_ID
    logger.info("Initializing audio deepfake model '%s' on %s ...", target_path, device)
    _FEATURE_EXTRACTOR = AutoFeatureExtractor.from_pretrained(target_path, local_files_only=LOCAL_MODEL_DIR.exists())
    _MODEL = Wav2Vec2ForSequenceClassification.from_pretrained(target_path, local_files_only=LOCAL_MODEL_DIR.exists())
    _MODEL.to(device)
    _MODEL.eval()
    logger.info("Audio deepfake classifier loaded successfully.")
    return _FEATURE_EXTRACTOR, _MODEL


def load_wav_file(audio_path: str | Path) -> tuple[np.ndarray, int]:
    """Read standard WAV file via scipy.io.wavfile. Convert stereo to mono, normalize to float32."""
    sr, data = wavfile.read(str(audio_path))
    if data.ndim > 1:
        # Average stereo channels to mono
        data = data.mean(axis=1)

    # Normalize integer PCM data to [-1.0, 1.0] float32
    if data.dtype == np.int16:
        data = data.astype(np.float32) / 32768.0
    elif data.dtype == np.int32:
        data = data.astype(np.float32) / 2147483648.0
    elif data.dtype == np.uint8:
        data = (data.astype(np.float32) - 128.0) / 128.0
    elif data.dtype != np.float32:
        data = data.astype(np.float32)

    return data, sr


def resample_linear(data: np.ndarray, orig_sr: int, target_sr: int = 16000) -> np.ndarray:
    """Fast linear interpolation resampling without requiring heavy external C-libraries."""
    if orig_sr == target_sr:
        return data
    duration = len(data) / orig_sr
    target_len = int(duration * target_sr)
    if target_len == 0:
        return np.zeros(1600, dtype=np.float32)
    orig_indices = np.linspace(0, len(data) - 1, target_len)
    return np.interp(orig_indices, np.arange(len(data)), data).astype(np.float32)


def analyze_audio_file(audio_path: str | Path) -> dict[str, Any]:
    """Execute real Wav2Vec2 model inference on a saved audio file.

    Returns structured output containing:
    - prediction: LIKELY_AUTHENTIC_SPEECH or SUSPICIOUS_SYNTHETIC_SPEECH
    - confidence: float score in [0.0, 1.0]
    - raw_scores: map of raw probabilities (fake vs real)
    - inference_time_ms: duration in milliseconds
    - model metadata and honest forensic limitations
    """
    path_obj = Path(audio_path)
    if not path_obj.exists():
        raise FileNotFoundError(f"Audio file does not exist: {audio_path}")

    # Decode audio
    try:
        raw_audio, sr = load_wav_file(path_obj)
        # Resample to 16,000 Hz expected by Wav2Vec2
        audio_16k = resample_linear(raw_audio, sr, 16000)
    except Exception as exc:
        raise ValueError(f"Failed to read or decode audio file {path_obj.name}: {exc}") from exc

    # Enforce minimum audio duration (at least 0.5 sec)
    if len(audio_16k) < 8000:
        raise ValueError("Audio clip is too short for reliable acoustic feature analysis (minimum 0.5s required).")

    # Limit to first 15 seconds to avoid memory spikes
    audio_16k = audio_16k[: 16000 * 15]

    feature_extractor, model = load_audio_classifier()
    device = get_device()

    t_start = time.perf_counter()
    inputs = feature_extractor(audio_16k, sampling_rate=16000, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        logits = model(**inputs).logits
        probs = torch.softmax(logits, dim=-1).squeeze().tolist()

    t_end = time.perf_counter()
    inference_time_ms = round((t_end - t_start) * 1000.0, 2)

    # Label 0: fake, Label 1: real
    fake_prob = round(float(probs[0]), 4)
    real_prob = round(float(probs[1]), 4)

    if fake_prob >= 0.5:
        prediction = "SUSPICIOUS_SYNTHETIC_SPEECH"
        confidence = fake_prob
        explanation = (
            f"Wav2Vec2 model detected acoustic synthesis patterns with {fake_prob*100:.1f}% confidence. "
            "Latent speech frame features correlate with text-to-speech (TTS) or voice cloning generative pipelines."
        )
    else:
        prediction = "LIKELY_AUTHENTIC_SPEECH"
        confidence = real_prob
        explanation = (
            f"Wav2Vec2 model assessed speech as organic/authentic recording with {real_prob*100:.1f}% confidence. "
            "No pervasive neural vocoder synthesis artifacts were detected."
        )

    limitations = [
        "Evaluates speech acoustic latent representations; performance depends on 16kHz audio sampling quality.",
        "Does not identify speaker identity, emotional state, or semantic content.",
        "Accuracy may degrade on heavily reverberant, compressed MP3, or noisy real-world recordings.",
        "Scores represent statistical model feature correlation, not mathematically verified proof of authenticity.",
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
        "raw_scores": {"fake": fake_prob, "real": real_prob},
        "limitations": limitations,
    }
