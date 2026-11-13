'use client';

import { MediaResult, ModuleStatus } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

interface Props {
  moduleStatus: ModuleStatus;
  mediaResult: MediaResult | null;
  loading: boolean;
  inputType?: string;
}

export function MediaPanel({ moduleStatus, mediaResult, loading, inputType }: Props) {
  if (moduleStatus.status === 'NOT_APPLICABLE') {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-slate-600 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-900 text-lg flex items-center gap-2">
            <span>📷</span> Media AI Analysis
          </h3>
          <StatusBadge status="NOT_APPLICABLE" />
        </div>
        <p className="text-sm text-slate-500 mt-2">
          This investigation was created from text input. No image, audio, or video media was attached for forensic evaluation.
        </p>
      </div>
    );
  }

  const detection = mediaResult?.analysis?.deepfake_detection;
  const fingerprint = mediaResult?.analysis?.fingerprint;
  const duplicates = mediaResult?.analysis?.near_duplicates || [];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <span>📷</span> Media AI Analysis & Deepfake Forensics
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Pretrained vision transformer inference, cryptographic media DNA, and perceptual hash matching
          </p>
        </div>
        <StatusBadge status={moduleStatus.status} />
      </div>

      {loading ? (
        <div className="py-10 flex flex-col items-center justify-center text-slate-500 text-sm">
          <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
          Running genuine neural inference and computing media fingerprints...
        </div>
      ) : moduleStatus.status === 'UNAVAILABLE' ? (
        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-4 text-slate-700">
          <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm mb-1">
            <span>ℹ️</span> Pretrained Detector Status: Unavailable
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {detection?.explanation ||
              'Image and audio deepfake detection models are not yet loaded in this environment. In accordance with zero-fabrication protocol, no simulated predictions or synthetic confidence scores are shown.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Metadata Bar */}
          {mediaResult?.filename && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Filename</span>
                <span className="font-mono text-slate-800 font-medium truncate block" title={mediaResult.filename}>
                  {mediaResult.filename}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Media Category</span>
                <span className="text-slate-800 capitalize font-medium">{mediaResult.media_type || inputType || 'Unknown'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">File Size</span>
                <span className="font-mono text-slate-800 font-medium">
                  {mediaResult.file_size_bytes
                    ? `${(mediaResult.file_size_bytes / 1024).toFixed(1)} KB`
                    : 'Recorded'}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Inference Execution</span>
                <span className="font-mono text-teal-800 font-medium">
                  {detection?.inference_time_ms ? `${detection.inference_time_ms} ms (${detection.device || 'CPU'})` : 'Completed'}
                </span>
              </div>
            </div>
          )}

          {/* AI-Generated Detection Card */}
          {detection && detection.prediction && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Model Assessment ({detection.model_name || 'Vision Transformer'})
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-base font-extrabold px-3 py-1 rounded-md tracking-wide ${
                        detection.prediction === 'SUSPICIOUS_AI_GENERATED'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {detection.prediction.replace(/_/g, ' ')}
                    </span>
                    {detection.confidence !== null && detection.confidence !== undefined && (
                      <span className="text-sm font-bold text-slate-700 font-mono">
                        {(detection.confidence * 100).toFixed(1)}% Confidence
                      </span>
                    )}
                  </div>
                </div>

                {detection.raw_scores && (
                  <div className="flex gap-2 text-xs font-mono">
                    <div className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700">
                      Artificial: <span className="font-bold text-rose-700">{((detection.raw_scores.artificial || 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700">
                      Human / Real: <span className="font-bold text-emerald-700">{((detection.raw_scores.human || 0) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confidence Bar */}
              {detection.confidence !== null && detection.confidence !== undefined && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Model Feature Correlation</span>
                    <span className="font-mono">{(detection.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        detection.prediction === 'SUSPICIOUS_AI_GENERATED' ? 'bg-rose-600' : 'bg-teal-600'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, detection.confidence * 100))}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Explanation */}
              {detection.explanation && (
                <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                  {detection.explanation}
                </p>
              )}

              {/* Limitations */}
              {detection.limitations && detection.limitations.length > 0 && (
                <div className="bg-slate-100/80 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <span className="font-semibold text-slate-800 block">Forensic Limitations & Methodology:</span>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {detection.limitations.map((lim, i) => (
                      <li key={i}>{lim}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Cryptographic & Perceptual Fingerprints */}
          {fingerprint && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>🧬</span> Media DNA & Perceptual Fingerprints
              </h4>
              <div className="space-y-2 text-xs">
                {fingerprint.sha256 && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase">SHA-256 Exact Checksum (Cryptographic)</span>
                      <span className="text-[10px] text-slate-400">Exact File Match</span>
                    </div>
                    <code className="text-[11px] text-slate-800 font-mono break-all block bg-slate-50 p-1.5 rounded border border-slate-100">
                      {fingerprint.sha256}
                    </code>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs">
                  {fingerprint.perceptual_hash_average && (
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-sans block">Average Hash (aHash)</span>
                      <span className="text-teal-800 font-semibold text-[11px] block mt-0.5">
                        {fingerprint.perceptual_hash_average}
                      </span>
                    </div>
                  )}
                  {fingerprint.perceptual_hash_difference && (
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-sans block">Difference Hash (dHash)</span>
                      <span className="text-teal-800 font-semibold text-[11px] block mt-0.5">
                        {fingerprint.perceptual_hash_difference}
                      </span>
                    </div>
                  )}
                  {fingerprint.perceptual_hash_perceptual && (
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-sans block">Perceptual Hash (pHash)</span>
                      <span className="text-teal-800 font-semibold text-[11px] block mt-0.5">
                        {fingerprint.perceptual_hash_perceptual}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Near-Duplicate / Media Reuse Matches */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>🔍</span> Media Reuse & Provenance Matches
              </h4>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                {duplicates.length} match{duplicates.length === 1 ? '' : 'es'} found
              </span>
            </div>

            {duplicates.length === 0 ? (
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-xs text-slate-500">
                <p className="font-medium text-slate-600">No matching media records found in local investigation repository.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Note: A lack of local matches does not imply this image has never appeared online or elsewhere.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {duplicates.map((match, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-3 rounded-lg border border-teal-200 text-xs space-y-1 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-900 font-mono">
                        {match.reference_investigation_id || match.reference_media_id}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                        {match.match_type.replace(/_/g, ' ')} • {(match.similarity_score * 100).toFixed(1)}% Match (dist={match.distance})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">{match.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
