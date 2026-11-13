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

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load module detailed results
  const loadModuleResults = useCallback(async (inv: Investigation) => {
    // 1. Media
    if (inv.modules.media_ai.status !== 'NOT_APPLICABLE') {
      setMediaLoading(true);
      fetchMediaResults(inv.investigation_id)
        .then(setMediaResult)
        .catch(() => setMediaResult(null))
        .finally(() => setMediaLoading(false));
    }

    // 2. Claims
    if (inv.modules.claim_ai.status !== 'NOT_APPLICABLE') {
      setClaimsLoading(true);
      fetchClaimResults(inv.investigation_id)
        .then(setClaimResult)
        .catch(() => setClaimResult(null))
        .finally(() => setClaimsLoading(false));
    }

    // 3. Network
    if (inv.modules.network_ai.status !== 'NOT_APPLICABLE') {
      setNetworkLoading(true);
      fetchNetworkResults(inv.investigation_id)
        .then(setNetworkResult)
        .catch(() => setNetworkResult(null))
        .finally(() => setNetworkLoading(false));
    }

    // 4. Propagation
    if (inv.modules.propagation.status !== 'NOT_APPLICABLE') {
      setPropLoading(true);
      fetchPropagationResults(inv.investigation_id)
        .then(setPropagationResult)
        .catch(() => setPropagationResult(null))
        .finally(() => setPropLoading(false));
    }
  }, []);

  // Initial load
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

  // Polling for live status while QUEUED or PROCESSING
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
        // keep polling silently
      }
    }, 2000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [investigation?.status, investigationId, loadModuleResults, investigation]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-7 h-7 border-2 border-slate-700 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-600 text-sm">Retrieving investigation dossier {investigationId}...</p>
      </div>
    );
  }

  if (error || !investigation) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-900 shadow-xs">
          <h2 className="text-lg font-bold">Investigation Not Found or Error</h2>
          <p className="text-xs text-rose-700 mt-1">{error || 'Investigation could not be loaded.'}</p>
        </div>
        <Link
          href="/"
          className="inline-block px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
        >
          ← Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link href="/" className="hover:text-slate-900">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-700 font-mono">{investigation.investigation_id}</span>
        </div>

        <button
          onClick={loadInitial}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <span>🔄</span> Refresh Status
        </button>
      </div>

      {/* Investigation Dossier Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                {investigation.input_type} Investigation
              </span>
              <span className="text-xs text-slate-400">ID:</span>
              <span className="font-mono text-teal-800 font-bold text-sm">
                {investigation.investigation_id}
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1.5">
              Multimodal Intelligence Dossier
            </h1>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
              Overall Status
            </span>
            <StatusBadge status={investigation.status} size="lg" />
          </div>
        </div>

        {/* Timestamps and Meta */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Created At</span>
            <span className="text-slate-800 font-mono font-medium">
              {new Date(investigation.created_at).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Last Updated</span>
            <span className="text-slate-800 font-mono font-medium">
              {new Date(investigation.updated_at).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Media Artifact</span>
            <span className="text-slate-800 truncate block font-medium">
              {investigation.media_filename || 'None (Text Only)'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Language Hint</span>
            <span className="text-slate-800 uppercase font-mono font-medium">
              {investigation.language_hint || 'Auto-Detect'}
            </span>
          </div>
        </div>

        {/* Input Text / Claim if any */}
        {investigation.text && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Submitted Narrative / Context:
            </span>
            <p className="text-xs sm:text-sm text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed font-sans">
              {investigation.text}
            </p>
          </div>
        )}
      </div>

      {/* Module Panels Grid */}
      <div className="space-y-6">
        {/* Panel 1: MEDIA_AI */}
        <MediaPanel
          moduleStatus={investigation.modules.media_ai}
          mediaResult={mediaResult}
          loading={mediaLoading}
          inputType={investigation.input_type}
        />

        {/* Panel 2: CLAIM_AI */}
        <ClaimPanel
          moduleStatus={investigation.modules.claim_ai}
          claimResult={claimResult}
          loading={claimsLoading}
        />

        {/* Panel 3: NETWORK_AI */}
        <NetworkPanel
          moduleStatus={investigation.modules.network_ai}
          networkResult={networkResult}
          loading={networkLoading}
        />

        {/* Panel 4: PROPAGATION */}
        <PropagationPanel
          moduleStatus={investigation.modules.propagation}
          propagationResult={propagationResult}
          loading={propLoading}
        />
      </div>
    </div>
  );
}

export default function InvestigationDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Loading investigation details...</p>
        </div>
      }
    >
      <InvestigationDetailContent />
    </Suspense>
  );
}
