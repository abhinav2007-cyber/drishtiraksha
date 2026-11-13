'use client';

import { PropagationResult, ModuleStatus } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

interface Props {
  moduleStatus: ModuleStatus;
  propagationResult: PropagationResult | null;
  loading: boolean;
}

export function PropagationPanel({ moduleStatus, propagationResult, loading }: Props) {
  if (moduleStatus.status === 'NOT_APPLICABLE') {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 text-slate-600 shadow-xs">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <span>📈</span> Information Spread
          </h3>
          <StatusBadge status="NOT_APPLICABLE" size="sm" />
        </div>
        <p className="text-xs text-slate-500">
          Information spread analysis requires timestamped post records. None were supplied with this submission.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <span>📈</span> Information Spread
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Observed chronological timeline, explicit parent-repost lineage, and spread velocity
          </p>
        </div>
        <StatusBadge status={moduleStatus.status} />
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center text-slate-500 text-xs">
          <div className="w-5 h-5 border-2 border-teal-700 border-t-transparent rounded-full animate-spin mb-2" />
          Reconstructing observed chronological spread...
        </div>
      ) : moduleStatus.status === 'UNAVAILABLE' ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-700">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs mb-1">
            <span>ℹ️</span> Information Spread: Unavailable
          </div>
          <p className="text-xs text-slate-600">
            No spread timeline data is available for this investigation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Velocity metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
              <span className="text-slate-500 block text-[11px]">Observed Posts</span>
              <span className="text-lg font-bold text-slate-900 font-mono">
                {propagationResult?.total_posts || 0}
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
              <span className="text-slate-500 block text-[11px]">Unique Accounts</span>
              <span className="text-lg font-bold text-slate-900 font-mono">
                {propagationResult?.unique_accounts || 0}
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
              <span className="text-slate-500 block text-[11px]">Observed Duration</span>
              <span className="text-lg font-bold text-teal-900 font-mono">
                {propagationResult?.observed_duration_minutes !== undefined
                  ? `${propagationResult.observed_duration_minutes.toFixed(0)} min`
                  : 'N/A'}
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
              <span className="text-slate-500 block text-[11px]">Velocity (Posts / Hr)</span>
              <span className="text-lg font-bold text-teal-900 font-mono">
                {propagationResult?.average_posts_per_hour !== null &&
                propagationResult?.average_posts_per_hour !== undefined
                  ? propagationResult.average_posts_per_hour.toFixed(1)
                  : 'N/A'}
              </span>
            </div>
          </div>

          {/* Timeline */}
          {propagationResult?.timeline && propagationResult.timeline.length > 0 && (
            <div className="space-y-2 mt-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Observed Chronological Lineage
              </span>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {propagationResult.timeline.map((entry, idx) => (
                  <div
                    key={entry.post_id || idx}
                    className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                  >
                    <span className="font-mono text-[11px] text-slate-500 mt-0.5 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 font-mono">
                          {entry.account_id}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                          {entry.language}
                        </span>
                      </div>
                      {entry.parent_post_id && (
                        <p className="text-[11px] text-slate-600 mt-1">
                          ↳ Repost of: <span className="font-mono text-slate-800 font-medium">{entry.parent_post_id}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strict disclaimers */}
          <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-0.5">
            <span className="font-bold text-[11px] uppercase tracking-wide block">Data Caveats:</span>
            <p>• The earliest timestamp is the earliest post in this specific dataset, not necessarily the original creator.</p>
            <p>• Only explicit parent links are displayed as lineage connections.</p>
          </div>
        </div>
      )}
    </div>
  );
}
