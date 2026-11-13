import { ClaimResult, ModuleStatus } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

interface Props {
  moduleStatus: ModuleStatus;
  claimResult: ClaimResult | null;
  loading: boolean;
}

export function ClaimPanel({ moduleStatus, claimResult, loading }: Props) {
  if (moduleStatus.status === 'NOT_APPLICABLE') {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-slate-400">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-200 text-lg flex items-center gap-2">
            <span>📝</span> Claim AI & Verification
          </h3>
          <StatusBadge status="NOT_APPLICABLE" />
        </div>
        <p className="text-sm text-slate-500 mt-2">
          Claim analysis is not applicable for this investigation submission.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div>
          <h3 className="font-semibold text-slate-100 text-lg flex items-center gap-2">
            <span>📝</span> Claim AI & Fact Verification
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Multilingual extraction (EN / HI / TE), Google Fact Check Tools evidence, and cross-lingual alignment
          </p>
        </div>
        <StatusBadge status={moduleStatus.status} />
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-sm animate-pulse">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
          Retrieving verified claims and evidence...
        </div>
      ) : moduleStatus.status === 'UNAVAILABLE' ? (
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 text-slate-300">
          <div className="flex items-center gap-2 text-amber-400 font-medium text-sm mb-1">
            <span>ℹ️</span> Claim AI Verification: Unavailable
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Multilingual embedding model (MiniLM-L12) and evidence search providers are not configured or downloaded in this stage. No fictitious claim verdicts or fake citations are presented.
          </p>
          <div className="mt-3 text-xs bg-slate-900 p-2.5 rounded border border-slate-800 font-mono text-slate-400">
            Four Canonical Verdicts: VERIFIED • CONTRADICTED • MISLEADING • UNVERIFIED
          </div>
        </div>
      ) : !claimResult?.claims || claimResult.claims.length === 0 ? (
        <div className="text-center py-6 text-slate-500 text-sm">
          No distinct factual claims were extracted from the input.
        </div>
      ) : (
        <div className="space-y-4">
          {claimResult.claims.map((claim) => (
            <div
              key={claim.claim_id}
              className="bg-slate-950 rounded-lg border border-slate-800 p-4 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {claim.language.toUpperCase()}
                  </span>
                  <span className="font-medium text-slate-200 text-sm">
                    {claim.claim_text}
                  </span>
                </div>
                <StatusBadge status={claim.verification?.status || 'UNVERIFIED'} />
              </div>

              {claim.verification?.explanation && (
                <p className="text-xs text-slate-400 italic bg-slate-900/60 p-2.5 rounded border border-slate-800/70">
                  {claim.verification.explanation}
                </p>
              )}

              {/* Evidence list */}
              {claim.verification?.evidence && claim.verification.evidence.length > 0 && (
                <div className="space-y-2 mt-2 pt-2 border-t border-slate-800/80">
                  <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
                    Retrieved Evidence Sources:
                  </span>
                  {claim.verification.evidence.map((ev) => (
                    <div
                      key={ev.evidence_id}
                      className="bg-slate-900/90 rounded p-2.5 border border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <a
                          href={ev.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          {ev.title || ev.source_name || 'Evidence Source'} ↗
                        </a>
                        {ev.rating && (
                          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-rose-300">
                            {ev.rating}
                          </span>
                        )}
                      </div>
                      {ev.snippet && (
                        <p className="text-slate-400 text-[11px] line-clamp-2">{ev.snippet}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Cross Language Matches */}
          {claimResult.cross_language_matches && claimResult.cross_language_matches.length > 0 && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 mt-4">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Cross-Language Matches (EN / HI / TE)
              </h4>
              <div className="space-y-2">
                {claimResult.cross_language_matches.map((match, idx) => (
                  <div key={idx} className="text-xs flex items-center justify-between bg-slate-900 p-2 rounded">
                    <span className="text-slate-300">
                      Group {match.claim_group_id}: {match.languages.join(' ↔ ')}
                    </span>
                    <span className="font-mono text-cyan-400">
                      Similarity: {(match.similarity_score * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
