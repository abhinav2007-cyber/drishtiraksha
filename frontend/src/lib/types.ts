/**
 * Canonical types for DRISHTIRAKSHA frontend
 * Perfectly mirrors backend schemas (Pydantic models)
 */

export type InvestigationState =
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED';

export type ModuleStatusEnum =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'UNAVAILABLE'
  | 'NOT_APPLICABLE';

export type InputType = 'text' | 'image' | 'audio' | 'video';

export type ClaimVerdict =
  | 'VERIFIED'
  | 'CONTRADICTED'
  | 'MISLEADING'
  | 'UNVERIFIED';

export interface ProcessingError {
  code: string;
  message: string;
  details?: string | null;
  recoverable: boolean;
  timestamp: string;
}

export interface ModuleStatus {
  status: ModuleStatusEnum;
  error?: ProcessingError | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface ModuleStatuses {
  media_ai: ModuleStatus;
  claim_ai: ModuleStatus;
  network_ai: ModuleStatus;
  propagation: ModuleStatus;
}

export interface InvestigationSummary {
  investigation_id: string;
  status: InvestigationState;
  input_type: InputType;
  media_filename?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Investigation {
  investigation_id: string;
  status: InvestigationState;
  input_type: InputType;
  text: string;
  language_hint?: string | null;
  media_id?: string | null;
  media_filename?: string | null;
  media_path?: string | null;
  created_at: string;
  updated_at: string;
  modules: ModuleStatuses;
}

export interface InvestigationStatusResponse {
  investigation_id: string;
  status: InvestigationState;
  modules: ModuleStatuses;
  updated_at: string;
}

export interface FingerprintResult {
  sha256: string;
  perceptual_hash_average: string;
  perceptual_hash_difference: string;
  perceptual_hash_perceptual?: string;
}

export interface NearDuplicateMatch {
  reference_media_id: string;
  reference_investigation_id?: string | null;
  match_type: string;
  similarity_score: number;
  distance: number;
  explanation: string;
}

export interface DeepfakeDetectionResult {
  status: ModuleStatusEnum;
  model_name?: string | null;
  model_version?: string | null;
  architecture?: string | null;
  prediction?: string | null;
  confidence?: number | null;
  explanation?: string | null;
  device?: string | null;
  inference_time_ms?: number | null;
  raw_scores?: Record<string, number> | null;
  limitations: string[];
}

export interface MediaAnalysis {
  deepfake_detection: DeepfakeDetectionResult;
  fingerprint?: FingerprintResult | null;
  near_duplicates: NearDuplicateMatch[];
}

export interface MediaResult {
  media_id?: string | null;
  investigation_id: string;
  media_type?: string | null;
  filename?: string | null;
  file_size_bytes?: number | null;
  analysis: MediaAnalysis;
  status?: ModuleStatusEnum;
  reason?: string;
}

export interface EvidenceItem {
  evidence_id: string;
  claim_id: string;
  source_type: string;
  source_name: string;
  source_url: string;
  title: string;
  snippet: string;
  rating: string;
  retrieved_at?: string | null;
  retrieval_method: string;
  relevance_score?: number | null;
}

export interface ClaimVerification {
  status: ClaimVerdict;
  evidence: EvidenceItem[];
  explanation: string;
  checked_sources: string[];
  checked_at?: string | null;
}

export interface Claim {
  claim_id: string;
  claim_text: string;
  language: string;
  extracted_from: string;
  claim_group_id?: string | null;
  verification: ClaimVerification;
}

export interface CrossLanguageMatch {
  claim_group_id: string;
  claims: string[];
  languages: string[];
  similarity_score: number;
  method: string;
}

export interface ClaimResult {
  investigation_id: string;
  status: ModuleStatusEnum;
  claims: Claim[];
  cross_language_matches: CrossLanguageMatch[];
  reason?: string;
}

export interface NetworkNode {
  id: string;
  posts_count: number;
  languages: string[];
  platforms: string[];
  degree_centrality?: number | null;
  betweenness_centrality?: number | null;
}

export interface NetworkEdge {
  source: string;
  target: string;
  score: number;
  reasons: string[];
  coordination_eligible: boolean;
}

export interface NetworkGraph {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export interface CoordinationCluster {
  cluster_id: string;
  campaign_id?: string | null;
  accounts: string[];
  account_count: number;
  coordination_score: number;
  status: string;
  reasons: { reason: string; observed_edge_count: number }[];
  supporting_edges: { source: string; target: string; score: number; reasons: string[] }[];
  interpretation: string;
}

export interface CoordinationResult {
  status: ModuleStatusEnum;
  clusters: CoordinationCluster[];
  clustered_account_count: number;
  unclustered_accounts: string[];
  threshold?: number | null;
  min_cluster_size?: number | null;
  method: string;
  limitations: string[];
}

export interface NetworkResult {
  investigation_id: string;
  status: ModuleStatusEnum;
  network: NetworkGraph;
  coordination: CoordinationResult;
  reason?: string;
}

export interface PropagationTimelineEntry {
  post_id: string;
  account_id: string;
  timestamp: string;
  claim_id?: string | null;
  language: string;
  media_hash?: string | null;
  parent_post_id?: string | null;
  activity: string;
}

export interface PropagationLink {
  source_post_id: string;
  target_post_id: string;
  source_account_id: string;
  target_account_id: string;
  relationship: string;
}

export interface PropagationResult {
  investigation_id: string;
  status: ModuleStatusEnum;
  claim_id?: string | null;
  total_posts: number;
  unique_accounts: number;
  first_observed_in_dataset?: string | null;
  last_observed_in_dataset?: string | null;
  observed_duration_minutes: number;
  average_posts_per_hour?: number | null;
  language_counts: Record<string, number>;
  timeline: PropagationTimelineEntry[];
  observed_propagation_links: PropagationLink[];
  limitations: string[];
  reason?: string;
}

export interface APIResponse<T> {
  success: boolean;
  data: T;
  error?: ProcessingError | null;
}

export interface HealthData {
  status: string;
  version: string;
  modules: {
    media_ai: { available: boolean; reason: string };
    claim_ai: { available: boolean; reason: string };
    network_ai: { available: boolean; reason: string };
    propagation: { available: boolean; reason: string };
  };
}
