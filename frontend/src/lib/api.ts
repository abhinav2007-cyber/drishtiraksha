import {
  APIResponse,
  HealthData,
  Investigation,
  InvestigationStatusResponse,
  InvestigationSummary,
  MediaResult,
  ClaimResult,
  NetworkResult,
  PropagationResult,
} from './types';

function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname) {
    return "http://" + window.location.hostname + ":8000/api/v1";
  }
  return 'http://127.0.0.1:8000/api/v1';
}

const API_BASE = 'http://127.0.0.1:8000/api/v1';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const errJson = await res.json();
      errorMsg = errJson.detail || errJson.message || errorMsg;
    } catch {
      // fallback to status text
      errorMsg = res.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }
  const envelope: APIResponse<T> = await res.json();
  if (!envelope.success && envelope.error) {
    throw new Error(envelope.error.message || 'API request failed');
  }
  return envelope.data;
}

export async function fetchHealth(): Promise<HealthData> {
  const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
  return handleResponse<HealthData>(res);
}

export async function fetchInvestigations(
  limit = 50,
  offset = 0
): Promise<InvestigationSummary[]> {
  const res = await fetch(
    `${API_BASE}/investigations?limit=${limit}&offset=${offset}`,
    { cache: 'no-store' }
  );
  return handleResponse<InvestigationSummary[]>(res);
}

export async function fetchInvestigation(id: string): Promise<Investigation> {
  const res = await fetch(`${API_BASE}/investigations/${encodeURIComponent(id)}`, {
    cache: 'no-store',
  });
  return handleResponse<Investigation>(res);
}

export async function fetchInvestigationStatus(
  id: string
): Promise<InvestigationStatusResponse> {
  const res = await fetch(
    `${API_BASE}/investigations/${encodeURIComponent(id)}/status`,
    { cache: 'no-store' }
  );
  return handleResponse<InvestigationStatusResponse>(res);
}

export async function createInvestigationText(
  text: string,
  languageHint?: string,
  socialPosts?: Record<string, unknown>[]
): Promise<{ investigation_id: string; status: string; created_at: string }> {
  const payload: Record<string, unknown> = {
    input_type: 'text',
    text: text.trim(),
  };
  if (languageHint) payload.language_hint = languageHint;
  if (socialPosts && socialPosts.length > 0) payload.social_posts = socialPosts;

  const res = await fetch(`${API_BASE}/investigations/json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<{
    investigation_id: string;
    status: string;
    created_at: string;
  }>(res);
}

export async function createInvestigationMedia(
  file: File,
  text?: string,
  languageHint?: string,
  socialPosts?: Record<string, unknown>[]
): Promise<{ investigation_id: string; status: string; created_at: string }> {
  const formData = new FormData();
  formData.append('file', file);
  if (text) formData.append('text', text.trim());
  if (languageHint) formData.append('language_hint', languageHint);
  if (socialPosts && socialPosts.length > 0) {
    formData.append('social_posts', JSON.stringify(socialPosts));
  }

  const res = await fetch(`${API_BASE}/investigations`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<{
    investigation_id: string;
    status: string;
    created_at: string;
  }>(res);
}

export async function fetchMediaResults(id: string): Promise<MediaResult> {
  const res = await fetch(
    `${API_BASE}/investigations/${encodeURIComponent(id)}/media`,
    { cache: 'no-store' }
  );
  return handleResponse<MediaResult>(res);
}

export async function fetchClaimResults(id: string): Promise<ClaimResult> {
  const res = await fetch(
    `${API_BASE}/investigations/${encodeURIComponent(id)}/claims`,
    { cache: 'no-store' }
  );
  return handleResponse<ClaimResult>(res);
}

export async function fetchNetworkResults(id: string): Promise<NetworkResult> {
  const res = await fetch(
    `${API_BASE}/investigations/${encodeURIComponent(id)}/network`,
    { cache: 'no-store' }
  );
  return handleResponse<NetworkResult>(res);
}

export async function fetchPropagationResults(
  id: string,
  claimId?: string
): Promise<PropagationResult> {
  let url = `${API_BASE}/investigations/${encodeURIComponent(id)}/propagation`;
  if (claimId) {
    url += `?claim_id=${encodeURIComponent(claimId)}`;
  }
  const res = await fetch(url, { cache: 'no-store' });
  return handleResponse<PropagationResult>(res);
}
