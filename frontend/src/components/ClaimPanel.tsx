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
          Claim analysis is not applicable for this investigation submission (no text content was provided).
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <span>📝</span> Multilingual Claim Intelligence & Verification
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Pretrained MiniLM-L12 multilingual embeddings (EN / HI / TE), cross-lingual grouping, and Google Fact Check Tools evidence
          </p>
        </div>
        <StatusBadge status={moduleStatus.status} />
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center text-slate-500 text-sm">
          <div className="w-6 h-6 border-2 border-slate-700 border-t-transparent rounded-full animate-spin mb-3" />
          Analyzing multilingual claims and searching verified evidence...
        </div>
      ) : moduleStatus.status === 'UNAVAILABLE' ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-700 space-y-2">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
            <span>ℹ️</span> Claim AI Verification: Unavailable
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            No claim intelligence records available for this investigation.
          </p>
        </div>
      ) : !claimResult?.claims || claimResult.claims.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-sm">
          No distinct factual claims were extracted from the input narrative.
        </div>
      ) : (
        <div className="space-y-4">
          {/* List of Claims */}
          {claimResult.claims.map((claim) => (
            <div
              key={claim.claim_id}
              className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start sm:items-center gap-2.5">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white text-slate-700 font-bold border border-slate-200 uppercase">
                    {claim.language}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">
                      {claim.claim_text}
                    </span>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono mt-0.5">
                      <span>ID: {claim.claim_id}</span>
                      {claim.claim_group_id && (
                        <span>Group: {claim.claim_group_id}</span>
                      )}
                    </div>
                  </div>
                </div>
                <StatusBadge status={claim.verification?.status || 'UNVERIFIED'} />
              </div>

              {/* Verification Explanation */}
              {claim.verification?.explanation && (
                <div className="text-xs text-slate-700 bg-white p-3 rounded border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Verification Rationale:
                  </span>
                  <p className="leading-relaxed">{claim.verification.explanation}</p>
                </div>
              )}

              {/* Evidence Sources */}
              {claim.verification?.evidence && claim.verification.evidence.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                    Retrieved Evidence & Fact-Checks:
                  </span>
                  {claim.verification.evidence.map((ev) => (
                    <div
                      key={ev.evidence_id}
                      className="bg-white rounded p-3 border border-slate-200 text-xs space-y-1.5"
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
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                            {ev.rating}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>Publisher: {ev.source_name || 'Third-party fact-checker'}</span>
                        <span>•</span>
                        <span>Method: {ev.retrieval_method || 'Google Fact Check Tools API'}</span>
                      </div>
                      {ev.snippet && (
                        <p className="text-slate-600 text-[11px] line-clamp-2 italic bg-slate-50 p-2 rounded border border-slate-100">
                          {ev.snippet}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Cross-Language Matches Section */}
          {claimResult.cross_language_matches && claimResult.cross_language_matches.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>🌐</span> Cross-Language Semantic Alignments
              </h4>
              <div className="grid grid-cols-1 gap-2.5">
                {claimResult.cross_language_matches.map((m, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {m.languages.join(' ↔ ').toUpperCase()}
                        </span>
                        <span className="text-slate-600 font-mono text-[11px]">
                          Group: {m.claim_group_id}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Method: {m.method}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 block">Cosine Similarity</span>
                      <span className="text-sm font-bold font-mono text-teal-800">
                        {(m.similarity_score * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Truth Disclaimer Alert */}
          <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200/70 text-[11px] text-amber-900 space-y-1">
            <span className="font-semibold block">Methodological Boundaries:</span>
            <p>• High semantic embedding similarity indicates topical/propositional alignment, NOT factual accuracy.</p>
            <p>• Claims default conservatively to <strong>UNVERIFIED</strong> unless corroborated by an authorized evidence review.</p>
            <p>• Statements with conflicting numbers, dates, or negation markers are strictly segregated into independent groups.</p>
          </div>
        </div>
      )}
    </div>
  );
}
