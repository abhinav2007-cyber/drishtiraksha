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
      setError(err instanceof Error ? err.message : 'Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real counts calculated directly from backend records
  const totalCount = investigations.length;
  const completedCount = investigations.filter((i) => i.status === 'COMPLETED').length;
  const processingCount = investigations.filter(
    (i) => i.status === 'PROCESSING' || i.status === 'QUEUED'
  ).length;
  const partialCount = investigations.filter((i) => i.status === 'PARTIAL').length;
  const failedCount = investigations.filter((i) => i.status === 'FAILED').length;

  return (
    <div className="space-y-8">
      {/* Top Header & CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 uppercase tracking-wider">
              Investigation Platform
            </span>
            <span className="text-xs text-slate-500">FastAPI • SQLite • Real-Time</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight mt-1">
            Investigator Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Multimodal deepfake identification, multilingual claim extraction, and account coordination analysis.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span> Refresh
          </button>
          <Link
            href="/investigate"
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-md shadow-cyan-900/30 transition-all hover:scale-[1.02] flex items-center gap-1.5"
          >
            <span>➕</span> New Investigation
          </Link>
        </div>
      </div>

      {/* Backend Connection Warning */}
      {error && (
        <div className="bg-rose-950/70 border border-rose-800 rounded-xl p-4 flex items-start justify-between gap-3 text-rose-200 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-semibold">Backend Connection Issue</p>
              <p className="text-xs text-rose-300 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="px-2.5 py-1 bg-rose-900 hover:bg-rose-800 rounded text-xs text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium block">Total Investigations</span>
          <span className="text-2xl font-extrabold text-slate-100 font-mono mt-1 block">
            {loading ? '-' : totalCount}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Recorded in database</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4">
          <span className="text-xs text-sky-400 font-medium block">Processing / Queued</span>
          <span className="text-2xl font-extrabold text-sky-300 font-mono mt-1 block">
            {loading ? '-' : processingCount}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Active pipeline</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4">
          <span className="text-xs text-emerald-400 font-medium block">Completed</span>
          <span className="text-2xl font-extrabold text-emerald-300 font-mono mt-1 block">
            {loading ? '-' : completedCount}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">All modules succeeded</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4">
          <span className="text-xs text-amber-400 font-medium block">Partial Results</span>
          <span className="text-2xl font-extrabold text-amber-300 font-mono mt-1 block">
            {loading ? '-' : partialCount}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Honest unavailable modules</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 col-span-2 md:col-span-1">
          <span className="text-xs text-rose-400 font-medium block">Failed</span>
          <span className="text-2xl font-extrabold text-rose-300 font-mono mt-1 block">
            {loading ? '-' : failedCount}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Fatal execution errors</span>
        </div>
      </div>

      {/* Module Architecture Status Indicator */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>🛡️</span> Architecture Module Availability
          </h3>
          <span className="text-[11px] text-slate-500">Live Health Check</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">MEDIA_AI</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  health?.modules?.media_ai?.available ? 'bg-emerald-400' : 'bg-zinc-600'
                }`}
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block truncate">
              {health?.modules?.media_ai?.reason || 'Deepfake Detection'}
            </span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">CLAIM_AI</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  health?.modules?.claim_ai?.available ? 'bg-emerald-400' : 'bg-zinc-600'
                }`}
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block truncate">
              {health?.modules?.claim_ai?.reason || 'Multilingual Verification'}
            </span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">NETWORK_AI</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  health?.modules?.network_ai?.available ? 'bg-emerald-400' : 'bg-zinc-600'
                }`}
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block truncate">
              {health?.modules?.network_ai?.reason || 'Account Graphs'}
            </span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">PROPAGATION</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  health?.modules?.propagation?.available ? 'bg-emerald-400' : 'bg-zinc-600'
                }`}
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block truncate">
              {health?.modules?.propagation?.reason || 'Lineage & Velocity'}
            </span>
          </div>
        </div>
      </div>

      {/* Investigations Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-slate-100 text-base">Recent Investigations</h2>
          <span className="text-xs text-slate-500">{investigations.length} recorded</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm animate-pulse">
            Loading investigation records...
          </div>
        ) : investigations.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <p className="text-sm">No investigations found in the database.</p>
            <Link
              href="/investigate"
              className="inline-block px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium"
            >
              Start First Investigation
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3">Investigation ID</th>
                  <th className="px-6 py-3">Input Type</th>
                  <th className="px-6 py-3">Media / Input</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {investigations.map((inv) => (
                  <tr key={inv.investigation_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-cyan-400 font-medium">
                      <Link href={`/investigations/${inv.investigation_id}`} className="hover:underline">
                        {inv.investigation_id}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="capitalize px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                        {inv.input_type}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 max-w-xs truncate text-slate-400">
                      {inv.media_filename || 'Text Investigation'}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={inv.status} size="sm" />
                    </td>
                    <td className="px-6 py-3.5 text-slate-400 whitespace-nowrap">
                      {new Date(inv.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Link
                        href={`/investigations/${inv.investigation_id}`}
                        className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
                      >
                        Inspect →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
