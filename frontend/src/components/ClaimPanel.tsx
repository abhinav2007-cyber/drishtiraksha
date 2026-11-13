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
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-slate-500 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-900 text-lg flex items-center gap-2">
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
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <span>📝</span> Claim AI & Fact Verification
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Multilingual extraction (EN / HI / TE), Google Fact Check Tools evidence, and cross-lingual alignment
          </p>
        </div>
        <StatusBadge status={moduleStatus.status} />
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center text-slate-500 text-sm">
          <div className="w-6 h-6 border-2 border-slate-700 border-t-transparent rounded-full animate-spin mb-3" />
          Retrieving verified claims and evidence...
        </div>
      ) : moduleStatus.status === 'UNAVAILABLE' ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-700 space-y-2">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
            <span>ℹ️</span> Claim AI Verification: Planned for Stage 4
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Multilingual embedding model (MiniLM-L12) and evidence search providers are not configured in this stage. In accordance with zero-fabrication protocol, no fictitious claim verdicts or fake citations are presented.
          </p>
          <div className="mt-2 text-xs bg-white p-2.5 rounded border border-slate-200 font-mono text-slate-600">
            Four Canonical Verdicts: VERIFIED • CONTRADICTED • MISLEADING • UNVERIFIED
          </div>
        </div>
      ) : !claimResult?.claims || claimResult.claims.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-sm">
          No distinct factual claims were extracted from the input.
        </div>
      ) : (
        <div className="space-y-4">
          {claimResult.claims.map((claim) => (
            <div
              key={claim.claim_id}
              className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-white text-slate-700 font-bold border border-slate-200">
                    {claim.language.toUpperCase()}
                  </span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {claim.claim_text}
                  </span>
                </div>
                <StatusBadge status={claim.verification?.status || 'UNVERIFIED'} />
              </div>

              {claim.verification?.explanation && (
                <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded border border-slate-200">
                  {claim.verification.explanation}
                </p>
              )}

              {/* Evidence list */}
              {claim.verification?.evidence && claim.verification.evidence.length > 0 && (
                <div className="space-y-2 mt-2 pt-2 border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                    Retrieved Evidence Sources:
                  </span>
                  {claim.verification.evidence.map((ev) => (
                    <div
                      key={ev.evidence_id}
                      className="bg-white rounded p-2.5 border border-slate-200 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <a
                          href={ev.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-teal-800 hover:underline flex items-center gap-1"
                        >
                          {ev.title || ev.source_name || 'Evidence Source'} ↗
                        </a>
                        {ev.rating && (
                          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                            {ev.rating}
                          </span>
                        )}
                      </div>
                      {ev.snippet && (
                        <p className="text-slate-600 text-[11px] line-clamp-2">{ev.snippet}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
