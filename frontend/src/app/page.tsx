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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 uppercase tracking-wider">
              Investigation Platform
            </span>
            <span className="text-xs text-slate-500">FastAPI • SQLite • Real-Time</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
            Investigator Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Multimodal deepfake identification, multilingual claim extraction, and account coordination analysis.
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
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5"
          >
            <span>➕</span> New Investigation
          </Link>
        </div>
      </div>

      {/* Backend Connection Warning */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start justify-between gap-3 text-rose-900 text-sm shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-semibold">Backend Connection Issue</p>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="px-2.5 py-1 bg-rose-800 hover:bg-rose-700 rounded text-xs text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold block">Total Investigations</span>
          <span className="text-2xl font-extrabold text-slate-900 font-mono mt-1 block">
            {loading ? '-' : totalCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Recorded in database</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-sky-700 font-semibold block">Processing / Queued</span>
          <span className="text-2xl font-extrabold text-sky-800 font-mono mt-1 block">
            {loading ? '-' : processingCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Active pipeline</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-emerald-700 font-semibold block">Completed</span>
          <span className="text-2xl font-extrabold text-emerald-800 font-mono mt-1 block">
            {loading ? '-' : completedCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">All modules succeeded</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-amber-700 font-semibold block">Partial Results</span>
          <span className="text-2xl font-extrabold text-amber-800 font-mono mt-1 block">
            {loading ? '-' : partialCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Honest unavailable modules</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs col-span-2 md:col-span-1">
          <span className="text-xs text-rose-700 font-semibold block">Failed</span>
          <span className="text-2xl font-extrabold text-rose-800 font-mono mt-1 block">
            {loading ? '-' : failedCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Fatal execution errors</span>
        </div>
      </div>

      {/* Module Architecture Status Indicator */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span>🛡️</span> Architecture Module Availability
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">Live Health Check</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">MEDIA_AI</span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  health?.modules?.media_ai?.available ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              />
            </div>
            <span className="text-[11px] text-slate-600 mt-1 block truncate">
              {health?.modules?.media_ai?.reason || 'Deepfake Detection'}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">CLAIM_AI</span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  health?.modules?.claim_ai?.available ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              />
            </div>
            <span className="text-[11px] text-slate-600 mt-1 block truncate">
              {health?.modules?.claim_ai?.reason || 'Multilingual Verification'}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">NETWORK_AI</span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  health?.modules?.network_ai?.available ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              />
            </div>
            <span className="text-[11px] text-slate-600 mt-1 block truncate">
              {health?.modules?.network_ai?.reason || 'Account Graphs'}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">PROPAGATION</span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  health?.modules?.propagation?.available ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              />
            </div>
            <span className="text-[11px] text-slate-600 mt-1 block truncate">
              {health?.modules?.propagation?.reason || 'Lineage & Velocity'}
            </span>
          </div>
        </div>
      </div>

      {/* Investigations Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="font-bold text-slate-900 text-sm">Recent Investigations</h2>
          <span className="text-xs text-slate-500 font-mono">{investigations.length} recorded</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <div className="w-5 h-5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading investigation records...
          </div>
        ) : investigations.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <p className="text-sm">No investigations found in the database.</p>
            <Link
              href="/investigate"
              className="inline-block px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              Start First Investigation
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Investigation ID</th>
                  <th className="px-6 py-3">Input Type</th>
                  <th className="px-6 py-3">Media / Input</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {investigations.map((inv) => (
                  <tr key={inv.investigation_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-teal-800 font-bold">
                      <Link href={`/investigations/${inv.investigation_id}`} className="hover:underline">
                        {inv.investigation_id}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="capitalize px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-medium">
                        {inv.input_type}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 max-w-xs truncate text-slate-600">
                      {inv.media_filename || 'Text Investigation'}
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
                        className="text-xs font-bold text-slate-900 hover:text-teal-800 hover:underline"
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
