import { NetworkResult, ModuleStatus } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

interface Props {
  moduleStatus: ModuleStatus;
  networkResult: NetworkResult | null;
  loading: boolean;
}

export function NetworkPanel({ moduleStatus, networkResult, loading }: Props) {
  if (moduleStatus.status === 'NOT_APPLICABLE') {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-slate-400">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-200 text-lg flex items-center gap-2">
            <span>🕸️</span> Network & Account Coordination
          </h3>
          <StatusBadge status="NOT_APPLICABLE" />
        </div>
        <p className="text-sm text-slate-500 mt-2">
          Network analysis requires social post records (account_id, timestamp, parent_post_id). No post records were supplied with this submission.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div>
          <h3 className="font-semibold text-slate-100 text-lg flex items-center gap-2">
            <span>🕸️</span> Network & Account Coordination
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Content association graphs, pairwise evidence, and multi-signal coordination clustering
          </p>
        </div>
        <StatusBadge status={moduleStatus.status} />
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-sm animate-pulse">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
          Building account relationship graph...
        </div>
      ) : moduleStatus.status === 'UNAVAILABLE' ? (
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 text-slate-300">
          <div className="flex items-center gap-2 text-amber-400 font-medium text-sm mb-1">
            <span>ℹ️</span> Network Analysis: Unavailable
          </div>
          <p className="text-xs text-slate-400">
            Network intelligence requires batch social post records to be evaluated.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Metrics summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
              <span className="text-slate-500 block text-[11px]">Accounts (Nodes)</span>
              <span className="text-lg font-bold text-slate-100 font-mono">
                {networkResult?.network?.nodes?.length || 0}
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
              <span className="text-slate-500 block text-[11px]">Relationships (Edges)</span>
              <span className="text-lg font-bold text-slate-100 font-mono">
                {networkResult?.network?.edges?.length || 0}
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
              <span className="text-slate-500 block text-[11px]">Coordination Clusters</span>
              <span className="text-lg font-bold text-amber-400 font-mono">
                {networkResult?.coordination?.clusters?.length || 0}
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
              <span className="text-slate-500 block text-[11px]">Clustered Accounts</span>
              <span className="text-lg font-bold text-slate-100 font-mono">
                {networkResult?.coordination?.clustered_account_count || 0}
              </span>
            </div>
          </div>

          {/* Coordination Clusters */}
          {networkResult?.coordination?.clusters && networkResult.coordination.clusters.length > 0 && (
            <div className="space-y-3 mt-4">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Detected Coordination Clusters
              </h4>
              {networkResult.coordination.clusters.map((cluster) => (
                <div
                  key={cluster.cluster_id}
                  className="bg-slate-950 rounded-lg border border-amber-900/40 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 text-sm">{cluster.cluster_id}</span>
                    <span className="text-xs bg-amber-950/80 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-mono">
                      Coordination Score: {cluster.coordination_score}%
                    </span>
                  </div>

                  <div className="text-xs text-slate-300">
                    <span className="text-slate-500">Accounts involved ({cluster.account_count}): </span>
                    <span className="font-mono text-cyan-300">{cluster.accounts.join(', ')}</span>
                  </div>

                  {cluster.reasons && cluster.reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {cluster.reasons.map((r, i) => (
                        <span
                          key={i}
                          className="text-[11px] bg-slate-900 text-slate-300 border border-slate-800 px-2 py-0.5 rounded"
                        >
                          {r.reason} ({r.observed_edge_count} edges)
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500 italic pt-1">
                    {cluster.interpretation ||
                      'A pattern requiring human review; not proof of shared ownership, bots, or malicious intent.'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Explicit interpretation rules */}
          <div className="bg-slate-950/60 p-3 rounded border border-slate-800/80 text-[11px] text-slate-500 space-y-1">
            <span className="font-semibold text-slate-400 block">Interpretation Limits:</span>
            <p>• Coordination scores are heuristic indicators, not calibrated probabilities.</p>
            <p>• Shared content or claims alone do not establish coordinated inauthentic behavior.</p>
            <p>• Network relationships represent observed data, not proof of malice or bot status.</p>
          </div>
        </div>
      )}
    </div>
  );
}
