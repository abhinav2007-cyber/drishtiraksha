'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  fetchInvestigation,
  fetchInvestigationStatus,
  fetchMediaResults,
  fetchClaimResults,
  fetchNetworkResults,
  fetchPropagationResults,
} from '@/lib/api';
import {
  Investigation,
  MediaResult,
  ClaimResult,
  NetworkResult,
  PropagationResult,
} from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { MediaPanel } from '@/components/MediaPanel';
import { ClaimPanel } from '@/components/ClaimPanel';
import { NetworkPanel } from '@/components/NetworkPanel';
import { PropagationPanel } from '@/components/PropagationPanel';

function InvestigationDetailContent() {
  const routerParams = useParams();
  const investigationId = (routerParams?.id as string) || '';

  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [mediaResult, setMediaResult] = useState<MediaResult | null>(null);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [networkResult, setNetworkResult] = useState<NetworkResult | null>(null);
  const [propagationResult, setPropagationResult] = useState<PropagationResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mediaLoading, setMediaLoading] = useState(false);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [propLoading, setPropLoading] = useState(false);

  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadModuleResults = useCallback(async (inv: Investigation) => {
    if (inv.modules.media_ai.status !== 'NOT_APPLICABLE') {
      setMediaLoading(true);
      fetchMediaResults(inv.investigation_id)
        .then(setMediaResult)
        .catch(() => setMediaResult(null))
        .finally(() => setMediaLoading(false));
    }

    if (inv.modules.claim_ai.status !== 'NOT_APPLICABLE') {
      setClaimsLoading(true);
      fetchClaimResults(inv.investigation_id)
        .then(setClaimResult)
        .catch(() => setClaimResult(null))
        .finally(() => setClaimsLoading(false));
    }

    if (inv.modules.network_ai.status !== 'NOT_APPLICABLE') {
      setNetworkLoading(true);
      fetchNetworkResults(inv.investigation_id)
        .then(setNetworkResult)
        .catch(() => setNetworkResult(null))
        .finally(() => setNetworkLoading(false));
    }

    if (inv.modules.propagation.status !== 'NOT_APPLICABLE') {
      setPropLoading(true);
      fetchPropagationResults(inv.investigation_id)
        .then(setPropagationResult)
        .catch(() => setPropagationResult(null))
        .finally(() => setPropLoading(false));
    }
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const inv = await fetchInvestigation(investigationId);
      setInvestigation(inv);
      loadModuleResults(inv);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load investigation');
    } finally {
      setLoading(false);
    }
  }, [investigationId, loadModuleResults]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!investigation) return;

    const isTerminal =
      investigation.status === 'COMPLETED' ||
      investigation.status === 'PARTIAL' ||
      investigation.status === 'FAILED';

    if (isTerminal) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const statusResp = await fetchInvestigationStatus(investigationId);
        setInvestigation((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: statusResp.status,
            modules: statusResp.modules,
            updated_at: statusResp.updated_at,
          };
        });

        if (
          statusResp.status === 'COMPLETED' ||
          statusResp.status === 'PARTIAL' ||
          statusResp.status === 'FAILED'
        ) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          const full = await fetchInvestigation(investigationId);
          setInvestigation(full);
          loadModuleResults(full);
        }
      } catch {
        // silent polling
      }
    }, 2000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [investigation, investigationId, loadModuleResults]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-600 text-xs">Loading investigation records...</p>
      </div>
    );
  }

  if (error || !investigation) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-900 shadow-xs">
          <span className="text-3xl block mb-2">⚠️</span>
          <h2 className="text-lg font-bold">Investigation Not Accessible</h2>
          <p className="text-xs text-rose-700 mt-1">{error || 'Investigation could not be located.'}</p>
          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={loadInitial}
              className="px-4 py-2 bg-rose-800 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition-colors"
            >
              Retry
            </button>
            <Link
              href="/"
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isTextOnly =
    investigation.input_type === 'text' &&
    investigation.modules.media_ai.status === 'NOT_APPLICABLE' &&
    investigation.modules.network_ai.status === 'NOT_APPLICABLE';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
        <Link href="/" className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1">
          ← Back to Dashboard
        </Link>
        <button
          onClick={loadInitial}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <span>🔄</span> Refresh
        </button>
      </div>

      {/* Primary Simplified View for Text/Claims */}
      {isTextOnly ? (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <h1 className="text-xl font-extrabold text-slate-900">
              Claim Verification Results
            </h1>

            {/* Submitted Claim */}
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Submitted Claim
              </span>
              <p className="text-sm font-semibold text-slate-900 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed">
                {investigation.text}
              </p>
            </div>

            {/* Claims & Verdicts */}
            {claimsLoading ? (
              <div className="py-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
                <span>Verifying against authoritative sources...</span>
              </div>
            ) : claimResult?.claims && claimResult.claims.length > 0 ? (
              <div className="space-y-4 pt-2">
                {claimResult.claims.map((claim) => (
                  <div
                    key={claim.claim_id}
                    className="p-5 rounded-xl border border-slate-200 bg-white space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <span className="text-sm font-bold text-slate-900">
                        {claim.claim_text}
                      </span>
                      <StatusBadge status={claim.verification?.status || 'UNVERIFIED'} size="md" />
                    </div>

                    {/* Short Explanation */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                        Outcome
                      </span>
                      <p className="text-xs text-slate-800 leading-relaxed font-medium">
                        {claim.verification?.explanation || 'Could not independently verify this claim.'}
                      </p>
                    </div>

                    {/* Clickable Evidence Sources */}
                    {claim.verification?.evidence && claim.verification.evidence.length > 0 && (
                      <div className="pt-2 space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Evidence Sources
                        </span>
                        <div className="space-y-1.5">
                          {claim.verification.evidence.map((ev) => (
                            <a
                              key={ev.evidence_id}
                              href={ev.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-3 rounded-lg border border-teal-200 bg-teal-50/40 hover:bg-teal-50 transition-colors text-xs"
                            >
                              <div className="flex items-center justify-between font-semibold text-teal-900 mb-0.5">
                                <span className="truncate">{ev.title || ev.source_name}</span>
                                <span className="text-teal-700 shrink-0 ml-2">Open Source ↗</span>
                              </div>
                              {ev.snippet && (
                                <p className="text-slate-600 text-[11px] line-clamp-2 leading-relaxed">
                                  {ev.snippet}
                                </p>
                              )}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No verifiable factual claims detected in text.</p>
            )}
          </div>
        </div>
      ) : (
        /* Multimodal investigations (Media or Social Post Dataset) */
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h1 className="text-xl font-extrabold text-slate-900">
                Investigation Findings
              </h1>
              <StatusBadge status={investigation.status} size="md" />
            </div>

            {investigation.text && (
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Submitted Narrative
                </span>
                <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {investigation.text}
                </p>
              </div>
            )}
          </div>

          {investigation.modules.media_ai.status !== 'NOT_APPLICABLE' && (
            <MediaPanel
              moduleStatus={investigation.modules.media_ai}
              mediaResult={mediaResult}
              loading={mediaLoading}
              inputType={investigation.input_type}
            />
          )}

          {investigation.modules.claim_ai.status !== 'NOT_APPLICABLE' && (
            <ClaimPanel
              moduleStatus={investigation.modules.claim_ai}
              claimResult={claimResult}
              loading={claimsLoading}
            />
          )}

          {investigation.modules.network_ai.status !== 'NOT_APPLICABLE' && (
            <NetworkPanel
              moduleStatus={investigation.modules.network_ai}
              networkResult={networkResult}
              loading={networkLoading}
            />
          )}

          {investigation.modules.propagation.status !== 'NOT_APPLICABLE' && (
            <PropagationPanel
              moduleStatus={investigation.modules.propagation}
              propagationResult={propagationResult}
              loading={propLoading}
            />
          )}
        </div>
      )}

      {/* Collapsible Advanced Details (Hidden by default) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <button
          onClick={() => setShowAdvancedDetails(!showAdvancedDetails)}
          className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span>⚙️</span>
            <span>Advanced Details & Technical Record</span>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">
            {showAdvancedDetails ? 'Hide details ▲' : 'Show details ▼'}
          </span>
        </button>

        {showAdvancedDetails && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Investigation ID</span>
                <span className="font-mono text-slate-800 font-bold text-[11px]">{investigation.investigation_id}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Input Type</span>
                <span className="capitalize text-slate-800 font-medium text-[11px]">{investigation.input_type}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Submission Time</span>
                <span className="text-slate-800 font-mono text-[11px]">{new Date(investigation.created_at).toLocaleString()}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Status</span>
                <span className="text-slate-800 font-semibold text-[11px]">{investigation.status}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Raw JSON Dossier
              </span>
              <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-[11px] font-mono leading-relaxed max-h-72">
                {JSON.stringify(
                  {
                    investigation,
                    claim_result: claimResult,
                    media_result: mediaResult,
                    network_result: networkResult,
                    propagation_result: propagationResult,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InvestigationDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 text-xs">Loading investigation details...</p>
        </div>
      }
    >
      <InvestigationDetailContent />
    </Suspense>
  );
}
