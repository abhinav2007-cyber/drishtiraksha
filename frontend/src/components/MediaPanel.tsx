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
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-slate-400">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-200 text-lg flex items-center gap-2">
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

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div>
          <h3 className="font-semibold text-slate-100 text-lg flex items-center gap-2">
            <span>📷</span> Media AI Analysis
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Deepfake detection, perceptual hashing, and cross-media provenance
          </p>
        </div>
        <StatusBadge status={moduleStatus.status} />
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-sm animate-pulse">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3" />
          Loading media forensics data...
        </div>
      ) : moduleStatus.status === 'UNAVAILABLE' ? (
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 text-slate-300">
          <div className="flex items-center gap-2 text-amber-400 font-medium text-sm mb-1">
            <span>ℹ️</span> Pretrained Detector Status: Unavailable
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {mediaResult?.analysis?.deepfake_detection?.explanation ||
              'Image and audio deepfake detection models are not yet loaded in this environment. In accordance with zero-fabrication protocol, no simulated predictions or synthetic confidence scores are shown.'}
          </p>
          <div className="mt-3 text-xs bg-slate-900 p-2.5 rounded border border-slate-800 font-mono text-slate-400">
            Hardware: CPU mode active • Models planned for Phase 2 integration
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Metadata */}
          {mediaResult?.filename && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block">Filename</span>
                <span className="font-mono text-slate-200 truncate block">{mediaResult.filename}</span>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block">Media Type</span>
                <span className="text-slate-200 capitalize">{mediaResult.media_type || inputType || 'Unknown'}</span>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block">File Size</span>
                <span className="font-mono text-slate-200">
                  {mediaResult.file_size_bytes
                    ? `${(mediaResult.file_size_bytes / 1024).toFixed(1)} KB`
                    : 'Recorded'}
                </span>
              </div>
            </div>
          )}

          {/* Fingerprint */}
          {mediaResult?.analysis?.fingerprint && (
            <div className="bg-slate-950/90 rounded-lg p-3.5 border border-slate-800 space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Cryptographic & Perceptual Fingerprints
              </h4>
              <div className="space-y-1.5 font-mono text-xs">
                {mediaResult.analysis.fingerprint.sha256 && (
                  <div>
                    <span className="text-slate-500 text-[11px] block">SHA-256 Exact Hash</span>
                    <span className="text-slate-300 break-all text-[11px] bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800/80 block">
                      {mediaResult.analysis.fingerprint.sha256}
                    </span>
                  </div>
                )}
                {mediaResult.analysis.fingerprint.perceptual_hash_average && (
                  <div>
                    <span className="text-slate-500 text-[11px] block">Average Hash (aHash)</span>
                    <span className="text-cyan-300 text-[11px] bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800/80 inline-block">
                      {mediaResult.analysis.fingerprint.perceptual_hash_average}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Deepfake Verdict */}
          {mediaResult?.analysis?.deepfake_detection?.prediction && (
            <div className="bg-slate-950/90 p-4 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase">Detection Verdict</span>
                <span className="font-bold text-sm text-cyan-400">
                  {mediaResult.analysis.deepfake_detection.prediction}
                </span>
              </div>
              {mediaResult.analysis.deepfake_detection.confidence !== null &&
                mediaResult.analysis.deepfake_detection.confidence !== undefined && (
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Model Confidence</span>
                      <span className="font-mono">
                        {(mediaResult.analysis.deepfake_detection.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-cyan-500 h-2 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, (mediaResult.analysis.deepfake_detection.confidence || 0) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
