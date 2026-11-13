"""DRISHTIRAKSHA — Canonical Pydantic schemas.

Every API request, response and stored record uses the models defined here.
Modules must not invent their own top-level schemas outside this file.
"""
from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


# ── helpers ────────────────────────────────────────────────────────────────

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


# ── enums ──────────────────────────────────────────────────────────────────

class InvestigationState(str, enum.Enum):
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    PARTIAL = "PARTIAL"
    FAILED = "FAILED"


class ModuleStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    UNAVAILABLE = "UNAVAILABLE"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class InputType(str, enum.Enum):
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"


class ClaimVerdict(str, enum.Enum):
    VERIFIED = "VERIFIED"
    CONTRADICTED = "CONTRADICTED"
    MISLEADING = "MISLEADING"
    UNVERIFIED = "UNVERIFIED"


# ── shared sub-models ─────────────────────────────────────────────────────

class ProcessingError(BaseModel):
    """Structured error for a module or sub-component."""
    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error message")
    details: str | None = Field(None, description="Additional diagnostic info")
    recoverable: bool = Field(True)
    timestamp: datetime = Field(default_factory=_now_utc)


class ModuleStatus(BaseModel):
    """Per-module processing status within an investigation."""
    status: ModuleStatusEnum = ModuleStatusEnum.PENDING
    error: ProcessingError | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None


# ── investigation ─────────────────────────────────────────────────────────

class InvestigationCreate(BaseModel):
    """Request body for creating an investigation from text (JSON)."""
    input_type: InputType = InputType.TEXT
    text: str = Field("", description="Text content to analyze")
    language_hint: str | None = Field(None, description="ISO 639-1 language hint")
    social_posts: list[dict[str, Any]] | None = Field(
        None,
        description="Optional social-post records for network/propagation analysis",
    )


class InvestigationSummary(BaseModel):
    """Lightweight investigation listing item."""
    investigation_id: str
    status: InvestigationState
    input_type: InputType
    media_filename: str | None = None
    created_at: datetime
    updated_at: datetime


class ModuleStatuses(BaseModel):
    media_ai: ModuleStatus = Field(default_factory=ModuleStatus)
    claim_ai: ModuleStatus = Field(default_factory=ModuleStatus)
    network_ai: ModuleStatus = Field(default_factory=ModuleStatus)
    propagation: ModuleStatus = Field(default_factory=ModuleStatus)


class Investigation(BaseModel):
    """Full investigation record."""
    investigation_id: str = Field(default_factory=lambda: _new_id("inv"))
    status: InvestigationState = InvestigationState.QUEUED
    input_type: InputType = InputType.TEXT
    text: str = ""
    language_hint: str | None = None
    media_id: str | None = None
    media_filename: str | None = None
    media_path: str | None = None
    created_at: datetime = Field(default_factory=_now_utc)
    updated_at: datetime = Field(default_factory=_now_utc)
    modules: ModuleStatuses = Field(default_factory=ModuleStatuses)


class InvestigationStatusResponse(BaseModel):
    """Lightweight status-poll response."""
    investigation_id: str
    status: InvestigationState
    modules: ModuleStatuses
    updated_at: datetime


# ── media results ─────────────────────────────────────────────────────────

class FingerprintResult(BaseModel):
    sha256: str = ""
    perceptual_hash_average: str = ""
    perceptual_hash_difference: str = ""
    perceptual_hash_perceptual: str = ""


class DeepfakeDetectionResult(BaseModel):
    status: ModuleStatusEnum = ModuleStatusEnum.PENDING
    model_name: str | None = None
    model_version: str | None = None
    prediction: str | None = None
    confidence: float | None = None
    explanation: str | None = None
    device: str | None = None
    inference_time_ms: float | None = None
    raw_scores: dict[str, float] | None = None
    limitations: list[str] = Field(default_factory=list)


class MediaAnalysis(BaseModel):
    deepfake_detection: DeepfakeDetectionResult = Field(
        default_factory=DeepfakeDetectionResult
    )
    fingerprint: FingerprintResult | None = None
    near_duplicates: list[dict[str, Any]] = Field(default_factory=list)


class MediaResult(BaseModel):
    media_id: str | None = None
    investigation_id: str = ""
    media_type: str | None = None
    filename: str | None = None
    file_size_bytes: int | None = None
    analysis: MediaAnalysis = Field(default_factory=MediaAnalysis)


# ── claim results ─────────────────────────────────────────────────────────

class EvidenceItem(BaseModel):
    evidence_id: str = Field(default_factory=lambda: _new_id("ev"))
    claim_id: str = ""
    source_type: str = ""
    source_name: str = ""
    source_url: str = ""
    title: str = ""
    snippet: str = ""
    rating: str = ""
    retrieved_at: datetime | None = None
    retrieval_method: str = ""
    relevance_score: float | None = None


class ClaimVerification(BaseModel):
    status: ClaimVerdict = ClaimVerdict.UNVERIFIED
    evidence: list[EvidenceItem] = Field(default_factory=list)
    explanation: str = ""
    checked_sources: list[str] = Field(default_factory=list)
    checked_at: datetime | None = None


class Claim(BaseModel):
    claim_id: str = Field(default_factory=lambda: _new_id("clm"))
    claim_text: str = ""
    language: str = "en"
    extracted_from: str = ""
    claim_group_id: str | None = None
    verification: ClaimVerification = Field(default_factory=ClaimVerification)


class CrossLanguageMatch(BaseModel):
    claim_group_id: str = ""
    claims: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    similarity_score: float = 0.0
    method: str = ""


class ClaimResult(BaseModel):
    investigation_id: str = ""
    status: ModuleStatusEnum = ModuleStatusEnum.PENDING
    claims: list[Claim] = Field(default_factory=list)
    cross_language_matches: list[CrossLanguageMatch] = Field(default_factory=list)


# ── network results ───────────────────────────────────────────────────────

class NetworkNode(BaseModel):
    id: str
    posts_count: int = 0
    languages: list[str] = Field(default_factory=list)
    platforms: list[str] = Field(default_factory=list)
    degree_centrality: float | None = None
    betweenness_centrality: float | None = None


class NetworkEdge(BaseModel):
    source: str
    target: str
    score: float = 0.0
    reasons: list[str] = Field(default_factory=list)
    coordination_eligible: bool = False


class NetworkGraph(BaseModel):
    nodes: list[NetworkNode] = Field(default_factory=list)
    edges: list[NetworkEdge] = Field(default_factory=list)


class CoordinationCluster(BaseModel):
    cluster_id: str = ""
    campaign_id: str | None = None
    accounts: list[str] = Field(default_factory=list)
    account_count: int = 0
    coordination_score: float = 0.0
    status: str = "POTENTIALLY_COORDINATED"
    reasons: list[dict[str, Any]] = Field(default_factory=list)
    supporting_edges: list[dict[str, Any]] = Field(default_factory=list)
    interpretation: str = (
        "A pattern requiring human review; "
        "not proof of shared ownership, bots, or malicious intent."
    )


class CoordinationResult(BaseModel):
    status: ModuleStatusEnum = ModuleStatusEnum.PENDING
    clusters: list[CoordinationCluster] = Field(default_factory=list)
    clustered_account_count: int = 0
    unclustered_accounts: list[str] = Field(default_factory=list)
    threshold: float | None = None
    min_cluster_size: int | None = None
    method: str = ""
    limitations: list[str] = Field(default_factory=list)


class NetworkResult(BaseModel):
    investigation_id: str = ""
    status: ModuleStatusEnum = ModuleStatusEnum.PENDING
    network: NetworkGraph = Field(default_factory=NetworkGraph)
    coordination: CoordinationResult = Field(default_factory=CoordinationResult)


# ── propagation results ───────────────────────────────────────────────────

class PropagationTimelineEntry(BaseModel):
    post_id: str
    account_id: str
    timestamp: str
    claim_id: str | None = None
    language: str = "unknown"
    media_hash: str | None = None
    parent_post_id: str | None = None
    activity: str = "post"


class PropagationLink(BaseModel):
    source_post_id: str
    target_post_id: str
    source_account_id: str
    target_account_id: str
    relationship: str = "observed_parent_reference"


class PropagationResult(BaseModel):
    investigation_id: str = ""
    status: ModuleStatusEnum = ModuleStatusEnum.PENDING
    claim_id: str | None = None
    total_posts: int = 0
    unique_accounts: int = 0
    first_observed_in_dataset: str | None = None
    last_observed_in_dataset: str | None = None
    observed_duration_minutes: float = 0.0
    average_posts_per_hour: float | None = None
    language_counts: dict[str, int] = Field(default_factory=dict)
    timeline: list[PropagationTimelineEntry] = Field(default_factory=list)
    observed_propagation_links: list[PropagationLink] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=lambda: [
        "The earliest timestamp is the earliest observation in this dataset, "
        "not necessarily the original source.",
        "Only explicit parent_post_id references are treated as propagation links.",
    ])


# ── API response wrapper ──────────────────────────────────────────────────

class APIResponse(BaseModel):
    """Uniform API response envelope."""
    success: bool = True
    data: Any = None
    error: ProcessingError | None = None
