'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchInvestigations, fetchHealth } from '@/lib/api';
import { InvestigationSummary, HealthData } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';

export default function DashboardPage() {
  const [investigations, setInvestigations] = useState<InvestigationSummary[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSystemDetails, setShowSystemDetails] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invList, healthData] = await Promise.all([
        fetchInvestigations(50, 0),
        fetchHealth().catch(() => null),
      ]);
      setInvestigations(invList);
      setHealth(healthData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Connection unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real counts strictly calculated from backend records
  const totalCount = investigations.length;
  const processingCount = investigations.filter(
    (i) => i.status === 'PROCESSING' || i.status === 'QUEUED'
  ).length;
  const completedCount = investigations.filter((i) => i.status === 'COMPLETED').length;
  const attentionCount = investigations.filter(
    (i) => i.status === 'PARTIAL' || i.status === 'FAILED'
  ).length;

  return (
    <div className="space-y-8">
      {/* 1. Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            DRISHTIRAKSHA
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Investigate suspicious media, claims and online activity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span> Refresh
          </button>
          <Link
            href="/investigate"
            className="px-4 py-2 rounded-lg bg-teal-800 hover:bg-teal-900 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5"
          >
            <span>➕</span> Start New Investigation
          </Link>
        </div>
      </div>

      {/* Backend Connection Alert if failed */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start justify-between gap-3 text-rose-900 text-sm shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <div>
              <p className="font-semibold text-xs sm:text-sm">Connection unavailable</p>
              <p className="text-xs text-rose-700 mt-0.5">
                Could not connect to the backend server. Please verify the API is running on localhost:8000.
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1 bg-rose-800 hover:bg-rose-700 rounded text-xs font-medium text-white transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Simple Overview Cards (from real backend records) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Total investigations</span>
          <span className="text-2xl font-extrabold text-slate-900 font-mono mt-1 block">
            {loading ? '-' : totalCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Recorded in database</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-sky-700 font-medium block">Currently processing</span>
          <span className="text-2xl font-extrabold text-sky-800 font-mono mt-1 block">
            {loading ? '-' : processingCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Active analyses</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-emerald-700 font-medium block">Completed analyses</span>
          <span className="text-2xl font-extrabold text-emerald-800 font-mono mt-1 block">
            {loading ? '-' : completedCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Ready for review</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-amber-700 font-medium block">Need attention</span>
          <span className="text-2xl font-extrabold text-amber-800 font-mono mt-1 block">
            {loading ? '-' : attentionCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Partial or failed</span>
        </div>
      </div>

      {/* 3. Recent Investigations */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="font-bold text-slate-900 text-sm">Recent Investigations</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Review recent verification records, submitted media and claims
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">{investigations.length} recorded</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <div className="w-5 h-5 border-2 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading investigation records...
          </div>
        ) : investigations.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <p className="text-sm text-slate-600">No investigations recorded yet.</p>
            <Link
              href="/investigate"
              className="inline-block px-4 py-2 rounded-lg bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Start First Investigation
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Investigation ID</th>
                  <th className="px-6 py-3">Content Type</th>
                  <th className="px-6 py-3">Submitted Content</th>
                  <th className="px-6 py-3">Processing Status</th>
                  <th className="px-6 py-3">Submission Time</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {investigations.map((inv) => (
                  <tr key={inv.investigation_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-teal-900 font-semibold">
                      <Link href={`/investigations/${inv.investigation_id}`} className="hover:underline">
                        {inv.investigation_id}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="capitalize px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                        {inv.input_type}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 max-w-xs truncate text-slate-600">
                      {inv.media_filename || 'Text claim submission'}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={inv.status} size="sm" />
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap">
                      {new Date(inv.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Link
                        href={`/investigations/${inv.investigation_id}`}
                        className="text-xs font-semibold text-teal-800 hover:text-teal-900 hover:underline"
                      >
                        View Results →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Collapsible System Details (Clean, unobtrusive technical information) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <button
          onClick={() => setShowSystemDetails(!showSystemDetails)}
          className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span>⚙️</span>
            <span>System Details & Model Diagnostics</span>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">
            {showSystemDetails ? 'Hide details ▲' : 'Show details ▼'}
          </span>
        </button>

        {showSystemDetails && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-800 block">Media Authenticity</span>
                <span className="text-[11px] text-slate-600 mt-0.5 block">
                  {health?.modules?.media_ai?.reason || 'Swin Transformer image detector & Wav2Vec2 speech detector'}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-800 block">Claim Verification</span>
                <span className="text-[11px] text-slate-600 mt-0.5 block">
                  {health?.modules?.claim_ai?.reason || 'Multilingual MiniLM sentence embeddings & evidence matching'}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-800 block">Account Coordination</span>
                <span className="text-[11px] text-slate-600 mt-0.5 block">
                  {health?.modules?.network_ai?.reason || 'Multi-signal heuristic graph clustering & centrality'}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-800 block">Information Spread</span>
                <span className="text-[11px] text-slate-600 mt-0.5 block">
                  {health?.modules?.propagation?.reason || 'Chronological repost timeline reconstruction'}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 pt-1 flex flex-col sm:flex-row justify-between gap-1">
              <span>Backend Version: {health?.version || '0.5.0'}</span>
              <span>Storage: SQLite (drishtiraksha.db)</span>
              <span>API Host: http://127.0.0.1:8000/api/v1</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
