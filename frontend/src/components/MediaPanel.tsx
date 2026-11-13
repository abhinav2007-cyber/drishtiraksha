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
      <div className="bg-white border border-slate-200 rounded-xl p-5 text-slate-600 shadow-xs">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <span>📷</span> Media Authenticity
          </h3>
          <StatusBadge status="NOT_APPLICABLE" size="sm" />
        </div>
        <p className="text-xs text-slate-500">
          This investigation was created from text input. No image, audio, or video file was provided.
        </p>
      </div>
    );
  }

  const detection = mediaResult?.analysis?.deepfake_detection;
  const fingerprint = mediaResult?.analysis?.fingerprint;
  const duplicates = mediaResult?.analysis?.near_duplicates || [];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <span>📷</span> Media Authenticity
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Deepfake detection model estimates, file fingerprinting, and near-duplicate matching
          </p>
        </div>
        <StatusBadge status={moduleStatus.status} />
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center text-slate-500 text-xs">
          <div className="w-5 h-5 border-2 border-teal-700 border-t-transparent rounded-full animate-spin mb-2" />
          Analyzing media authenticity and computing fingerprints...
        </div>
      ) : moduleStatus.status === 'UNAVAILABLE' ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-700">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs mb-1">
            <span>ℹ️</span> Pretrained Detector Status: Unavailable
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {detection?.explanation ||
              'A genuine detector is not available for this media format in this environment. No simulated scores are generated.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Metadata bar */}
          {mediaResult?.filename && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Filename</span>
                <span className="font-mono text-slate-800 font-medium truncate block" title={mediaResult.filename}>
                  {mediaResult.filename}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Media Type</span>
                <span className="text-slate-800 capitalize font-medium">{mediaResult.media_type || inputType || 'Media'}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">File Size</span>
                <span className="font-mono text-slate-800 font-medium">
                  {mediaResult.file_size_bytes
                    ? `${(mediaResult.file_size_bytes / 1024).toFixed(1)} KB`
                    : 'Recorded'}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Inference Latency</span>
                <span className="font-mono text-teal-800 font-medium">
                  {detection?.inference_time_ms ? `${detection.inference_time_ms} ms (${detection.device || 'CPU'})` : 'Completed'}
                </span>
              </div>
            </div>
          )}

          {/* AI-Generated Detection Card */}
          {detection && detection.prediction && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Model Finding & Confidence Estimate
                </span>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                    detection.prediction.includes('AUTHENTIC') || detection.prediction.includes('REAL')
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}
                >
                  {detection.prediction.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Confidence estimate bar */}
              {detection.confidence !== null && detection.confidence !== undefined && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-700">
                    <span className="font-medium">Model Output Confidence:</span>
                    <span className="font-bold font-mono text-teal-900">
                      {(detection.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        detection.prediction.includes('AUTHENTIC') || detection.prediction.includes('REAL')
                          ? 'bg-emerald-600'
                          : 'bg-rose-600'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, detection.confidence * 100))}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Plain language explanation */}
              {detection.explanation && (
                <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                  {detection.explanation}
                </p>
              )}

              {/* Limitations note */}
              {detection.limitations && detection.limitations.length > 0 && (
                <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1">
                  <span className="font-bold text-[11px] uppercase tracking-wide block">
                    Important Technical Limitations:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {detection.limitations.map((lim, idx) => (
                      <li key={idx}>{lim}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Fingerprints & Near-Duplicates */}
          {fingerprint && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Cryptographic Fingerprint (Media DNA)
              </span>
              {fingerprint.sha256 && (
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                  <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">SHA-256 Checksum:</span>
                  <code className="text-[11px] text-slate-800 font-mono break-all block">
                    {fingerprint.sha256}
                  </code>
                </div>
              )}
            </div>
          )}

          {/* Duplicates */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Media Reuse & Provenance Matches
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {duplicates.length} local match{duplicates.length === 1 ? '' : 'es'}
              </span>
            </div>
            {duplicates.length === 0 ? (
              <p className="text-xs text-slate-500 bg-white p-3 rounded-lg border border-slate-200">
                No matching media records found in local investigation database. (This does not prove the media has never appeared online).
              </p>
            ) : (
              <div className="space-y-2">
                {duplicates.map((match, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-teal-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-900 font-mono">
                        {match.reference_investigation_id || match.reference_media_id}
                      </span>
                      <span className="text-[11px] font-semibold text-teal-800">
                        {(match.similarity_score * 100).toFixed(1)}% Match
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{match.explanation}</p>
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
