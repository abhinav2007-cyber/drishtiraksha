'use client';

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
      <div className="bg-white border border-slate-200 rounded-xl p-5 text-slate-600 shadow-xs">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <span>📝</span> Claim Verification
          </h3>
          <StatusBadge status="NOT_APPLICABLE" size="sm" />
        </div>
        <p className="text-xs text-slate-500">
          Claim verification is not applicable for this submission (no text content or claim caption was provided).
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <span>📝</span> Claim Verification
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Multilingual claim extraction (EN, HI, TE), independent fact-check corroboration, and semantic alignment
          </p>
        </div>
        <StatusBadge status={moduleStatus.status} />
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center text-slate-500 text-xs">
          <div className="w-5 h-5 border-2 border-teal-700 border-t-transparent rounded-full animate-spin mb-2" />
          Extracting assertions and checking third-party evidence...
        </div>
      ) : moduleStatus.status === 'UNAVAILABLE' ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-700 space-y-1">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
            <span>ℹ️</span> Claim Verification: Unavailable
          </div>
          <p className="text-xs text-slate-600">
            No claim records available for this investigation.
          </p>
        </div>
      ) : !claimResult?.claims || claimResult.claims.length === 0 ? (
        <div className="text-center py-6 text-slate-500 text-xs">
          No distinct factual claims were extracted from the input narrative.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Claims List */}
          {claimResult.claims.map((claim) => (
            <div
              key={claim.claim_id}
              className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3"
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
                    <span className="text-[11px] text-slate-500 font-mono">
                      Claim ID: {claim.claim_id}
                    </span>
                  </div>
                </div>
                <StatusBadge status={claim.verification?.status || 'UNVERIFIED'} />
              </div>

              {/* Verification Rationale */}
              {claim.verification?.explanation && (
                <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                    Verification Outcome & Rationale:
                  </span>
                  <p className="leading-relaxed">{claim.verification.explanation}</p>
                </div>
              )}

              {/* Evidence Items */}
              {claim.verification?.evidence && claim.verification.evidence.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                    Corroborating Evidence:
                  </span>
                  {claim.verification.evidence.map((ev) => (
                    <div
                      key={ev.evidence_id}
                      className="bg-white rounded-lg p-3 border border-slate-200 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <a
                          href={ev.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-teal-800 hover:underline flex items-center gap-1"
                        >
                          {ev.title || ev.source_name || 'Source Article'} ↗
                        </a>
                        {ev.rating && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                            Rating: {ev.rating}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Publisher: {ev.source_name || 'Fact-checker'} • Retrieval: {ev.retrieval_method}
                      </p>
                      {ev.snippet && (
                        <p className="text-slate-600 text-[11px] bg-slate-50 p-2 rounded border border-slate-100 italic">
                          {ev.snippet}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Cross-Language Alignment */}
          {claimResult.cross_language_matches && claimResult.cross_language_matches.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Cross-Language Semantic Alignment
              </span>
              <div className="grid grid-cols-1 gap-2">
                {claimResult.cross_language_matches.map((m, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 mr-2">
                        {m.languages.join(' ↔ ').toUpperCase()}
                      </span>
                      <span className="text-slate-600 text-[11px]">
                        Method: {m.method}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-teal-900">
                        {(m.similarity_score * 100).toFixed(1)}% Match
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conservative Boundary Note */}
          <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-0.5">
            <span className="font-bold text-[11px] uppercase tracking-wide block">Verification Protocol:</span>
            <p>• High semantic similarity indicates shared topic, not factual truth.</p>
            <p>• When external fact-check retrieval is unconfigured or returns no direct match, claims remain <strong>UNVERIFIED</strong> by default.</p>
          </div>
        </div>
      )}
    </div>
  );
}
