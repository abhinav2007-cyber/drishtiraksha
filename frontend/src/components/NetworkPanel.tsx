'use client';

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
      <div className="bg-white border border-slate-200 rounded-xl p-5 text-slate-600 shadow-xs">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <span>🌐</span> Account Coordination
          </h3>
          <StatusBadge status="NOT_APPLICABLE" size="sm" />
        </div>
        <p className="text-xs text-slate-500">
          Account coordination analysis requires observed social post records. None were supplied with this submission.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <span>🌐</span> Account Coordination
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Content association graphs, pairwise evidence, and multi-signal coordination clustering
          </p>
        </div>
        <StatusBadge status={moduleStatus.status} />
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center text-slate-500 text-xs">
          <div className="w-5 h-5 border-2 border-teal-700 border-t-transparent rounded-full animate-spin mb-2" />
          Building account interaction graph...
        </div>
      ) : moduleStatus.status === 'UNAVAILABLE' ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-700">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs mb-1">
            <span>ℹ️</span> Account Coordination: Unavailable
          </div>
          <p className="text-xs text-slate-600">
            Network intelligence requires batch social post records to be evaluated.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Metrics summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
              <span className="text-slate-500 block text-[11px]">Observed Accounts</span>
              <span className="text-lg font-bold text-slate-900 font-mono">
                {networkResult?.network?.nodes?.length || 0}
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
              <span className="text-slate-500 block text-[11px]">Observed Edges</span>
              <span className="text-lg font-bold text-slate-900 font-mono">
                {networkResult?.network?.edges?.length || 0}
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
              <span className="text-slate-500 block text-[11px]">Coordination Clusters</span>
              <span className="text-lg font-bold text-amber-800 font-mono">
                {networkResult?.coordination?.clusters?.length || 0}
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
              <span className="text-slate-500 block text-[11px]">Clustered Accounts</span>
              <span className="text-lg font-bold text-slate-900 font-mono">
                {networkResult?.coordination?.clustered_account_count || 0}
              </span>
            </div>
          </div>

          {/* Coordination Clusters */}
          {networkResult?.coordination?.clusters && networkResult.coordination.clusters.length > 0 && (
            <div className="space-y-3 mt-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Detected Candidate Clusters
              </span>
              {networkResult.coordination.clusters.map((cluster) => (
                <div
                  key={cluster.cluster_id}
                  className="bg-amber-50/50 rounded-xl border border-amber-200 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-950 text-sm">{cluster.cluster_id}</span>
                    <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-mono font-semibold">
                      Coordination Score: {cluster.coordination_score}%
                    </span>
                  </div>

                  <div className="text-xs text-slate-800">
                    <span className="text-slate-500">Accounts ({cluster.account_count}): </span>
                    <span className="font-mono text-teal-900 font-semibold">{cluster.accounts.join(', ')}</span>
                  </div>

                  {cluster.reasons && cluster.reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {cluster.reasons.map((r, i) => (
                        <span
                          key={i}
                          className="text-[11px] bg-white text-slate-700 border border-slate-200 px-2 py-0.5 rounded"
                        >
                          {r.reason} ({r.observed_edge_count} edges)
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-600 italic pt-1">
                    {cluster.interpretation ||
                      'Candidate coordination flagged for human review. Does not establish bots or malicious intent.'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Explicit interpretation rules */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-0.5">
            <span className="font-bold text-[11px] uppercase tracking-wide text-slate-700 block">Interpretation Bounds:</span>
            <p>• Coordination scores are heuristic indicators of shared timing/media, not proof of bot behavior.</p>
            <p>• High co-occurrence may also reflect organic breaking news sharing.</p>
          </div>
        </div>
      )}
    </div>
  );
}
