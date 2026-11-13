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
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-slate-400">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-200 text-lg flex items-center gap-2">
            <span>📈</span> Propagation Intelligence
          </h3>
          <StatusBadge status="NOT_APPLICABLE" />
        </div>
        <p className="text-sm text-slate-500 mt-2">
          Propagation timelines require chronological post records with timestamps. No timestamped post metadata was provided.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div>
          <h3 className="font-semibold text-slate-100 text-lg flex items-center gap-2">
            <span>📈</span> Propagation Intelligence
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Observed chronological timeline, explicit parent-repost lineage, and spread velocity
          </p>
        </div>
        <StatusBadge status={moduleStatus.status} />
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-sm animate-pulse">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
          Reconstructing observed posting timeline...
        </div>
      ) : moduleStatus.status === 'UNAVAILABLE' ? (
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 text-slate-300">
          <div className="flex items-center gap-2 text-amber-400 font-medium text-sm mb-1">
            <span>ℹ️</span> Propagation Timeline: Unavailable
          </div>
          <p className="text-xs text-slate-400">
            No propagation data is available for this investigation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Velocity metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
              <span className="text-slate-500 block text-[11px]">Total Observed Posts</span>
              <span className="text-lg font-bold text-slate-100 font-mono">
                {propagationResult?.total_posts || 0}
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
              <span className="text-slate-500 block text-[11px]">Unique Accounts</span>
              <span className="text-lg font-bold text-slate-100 font-mono">
                {propagationResult?.unique_accounts || 0}
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
              <span className="text-slate-500 block text-[11px]">Observed Duration</span>
              <span className="text-lg font-bold text-cyan-400 font-mono">
                {propagationResult?.observed_duration_minutes !== undefined
                  ? `${propagationResult.observed_duration_minutes.toFixed(0)} min`
                  : 'N/A'}
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
              <span className="text-slate-500 block text-[11px]">Avg Posts / Hour</span>
              <span className="text-lg font-bold text-purple-400 font-mono">
                {propagationResult?.average_posts_per_hour !== null &&
                propagationResult?.average_posts_per_hour !== undefined
                  ? propagationResult.average_posts_per_hour.toFixed(1)
                  : 'N/A'}
              </span>
            </div>
          </div>

          {/* Timeline */}
          {propagationResult?.timeline && propagationResult.timeline.length > 0 && (
            <div className="space-y-2 mt-4">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Observed Chronological Lineage
              </h4>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {propagationResult.timeline.map((entry, idx) => (
                  <div
                    key={entry.post_id || idx}
                    className="flex items-start gap-3 p-2.5 rounded bg-slate-950 border border-slate-800 text-xs"
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
                        <span className="font-semibold text-cyan-300 font-mono">
                          {entry.account_id}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {entry.language}
                        </span>
                        {entry.activity && (
                          <span className="text-[10px] text-slate-500">
                            ({entry.activity.replace(/_/g, ' ')})
                          </span>
                        )}
                      </div>
                      {entry.parent_post_id && (
                        <p className="text-[11px] text-slate-400 mt-1">
                          ↳ Observed parent post: <span className="font-mono text-slate-300">{entry.parent_post_id}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strict disclaimers */}
          <div className="bg-slate-950/60 p-3 rounded border border-slate-800/80 text-[11px] text-slate-500 space-y-1">
            <span className="font-semibold text-slate-400 block">Interpretation Limits:</span>
            <p>• The earliest timestamp is the earliest observation in this dataset, not proven original source.</p>
            <p>• Only explicit parent_post_id references are treated as propagation links.</p>
            <p>• Chronological sequence does not prove causation.</p>
          </div>
        </div>
      )}
    </div>
  );
}
