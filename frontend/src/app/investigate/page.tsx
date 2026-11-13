'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createInvestigationText, createInvestigationMedia } from '@/lib/api';

const ALLOWED_EXTENSIONS = {
  image: ['.jpg', '.jpeg', '.png', '.webp', '.bmp'],
  audio: ['.wav', '.mp3', '.ogg', '.flac', '.m4a'],
  video: ['.mp4', '.avi', '.mov', '.webm', '.mkv'],
};

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB limit

export default function NewInvestigationPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'text' | 'media'>('text');
  const [text, setText] = useState('');
  const [languageHint, setLanguageHint] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [includeSocialPosts, setIncludeSocialPosts] = useState(false);
  const [socialPostsJson, setSocialPostsJson] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    id: string;
    status: string;
  } | null>(null);

  // File validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError(`File size exceeds maximum limit of 50 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB selected).`);
      e.target.value = '';
      return;
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const allAllowed = [
      ...ALLOWED_EXTENSIONS.image,
      ...ALLOWED_EXTENSIONS.audio,
      ...ALLOWED_EXTENSIONS.video,
    ];

    if (!allAllowed.includes(ext)) {
      setError(
        `File format '${ext}' is not supported. Allowed formats: ${allAllowed.join(', ')}`
      );
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessInfo(null);

    let parsedPosts: Record<string, unknown>[] | undefined;
    if (includeSocialPosts && socialPostsJson.trim()) {
      try {
        parsedPosts = JSON.parse(socialPostsJson);
        if (!Array.isArray(parsedPosts)) {
          throw new Error('Social posts must be a JSON array of post records');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Invalid social posts JSON format');
        return;
      }
    }

    setLoading(true);

    try {
      let result: { investigation_id: string; status: string; created_at: string };

      if (activeTab === 'text') {
        if (!text.trim()) {
          throw new Error('Please enter text content to analyze.');
        }
        result = await createInvestigationText(
          text,
          languageHint || undefined,
          parsedPosts
        );
      } else {
        if (!selectedFile) {
          throw new Error('Please select an image, audio, or video file to analyze.');
        }
        result = await createInvestigationMedia(
          selectedFile,
          text.trim() || undefined,
          languageHint || undefined,
          parsedPosts
        );
      }

      setSuccessInfo({ id: result.investigation_id, status: result.status });

      // Navigate after brief confirmation
      setTimeout(() => {
        router.push(`/investigations/${result.investigation_id}`);
      }, 700);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit investigation to backend.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/" className="text-xs text-teal-800 hover:underline flex items-center gap-1 mb-2 font-medium">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Initiate Investigation</h1>
        <p className="text-sm text-slate-600 mt-1">
          Submit suspicious media artifacts or social posts for automated multimodal verification.
        </p>
      </div>

      {/* Success banner */}
      {successInfo && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 text-sm flex items-center justify-between shadow-xs">
          <div>
            <p className="font-bold">Investigation Created: {successInfo.id}</p>
            <p className="text-xs text-emerald-700">
              State: {successInfo.status} • Redirecting to real-time investigation dossier...
            </p>
          </div>
          <span className="text-lg animate-spin">⏳</span>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-900 text-sm shadow-xs">
          <p className="font-semibold flex items-center gap-1.5">
            <span>⚠️</span> Validation / Submission Error
          </p>
          <p className="text-xs text-rose-700 mt-1">{error}</p>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-200 pb-3 gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveTab('text');
              setError(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'text'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            💬 Text / Narrative Claim
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('media');
              setError(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'media'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            📸 Media Upload (Image / Audio / Video)
          </button>
        </div>

        {/* Tab 1: Text Claim */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1 tracking-wider">
                Suspicious Claim or Social Text <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                required
                placeholder="Enter claim text in English, Hindi, or Telugu (e.g. A major bank will shut tomorrow. Withdraw all money immediately.)"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-1 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1 tracking-wider">
                Language Hint (Optional)
              </label>
              <select
                value={languageHint}
                onChange={(e) => setLanguageHint(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
              >
                <option value="">Auto-Detect Language</option>
                <option value="en">English (en)</option>
                <option value="hi">Hindi (hi)</option>
                <option value="te">Telugu (te)</option>
              </select>
            </div>
          </div>
        )}

        {/* Tab 2: Media Upload */}
        {activeTab === 'media' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1 tracking-wider">
                Select Media File <span className="text-rose-500">*</span>
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png,.webp,.bmp,.wav,.mp3,.ogg,.flac,.m4a,.mp4,.avi,.mov,.webm,.mkv"
                className="block w-full text-xs text-slate-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer bg-slate-50 border border-slate-300 rounded-lg p-2"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Supported: Images (.jpg, .png, .webp, .bmp), Audio (.wav, .mp3, .flac), Video (.mp4, .mov). Max limit: 50MB.
              </p>
            </div>

            {selectedFile && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900">{selectedFile.name}</span>
                  <span className="text-slate-500 block">
                    {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'binary'}
                  </span>
                </div>
                <span className="text-teal-700 font-semibold">✓ Ready for analysis</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1 tracking-wider">
                Accompanying Caption or Claim (Optional)
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Optional text caption that appeared with this media"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white"
              />
            </div>
          </div>
        )}

        {/* Optional Social Post Records for Network/Propagation */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 uppercase tracking-wider">
              <input
                type="checkbox"
                checked={includeSocialPosts}
                onChange={(e) => setIncludeSocialPosts(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-0"
              />
              Attach Observed Post Metadata (Network & Lineage Analysis)
            </label>
          </div>

          {includeSocialPosts && (
            <div className="space-y-3 mt-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800">
                  Provide Dataset (Paste JSON or Upload File)
                </span>
                <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 bg-white px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-100 transition-colors">
                  <span>📁 Upload JSON File</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const content = event.target?.result as string;
                        setSocialPostsJson(content);
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>

              <textarea
                value={socialPostsJson}
                onChange={(e) => setSocialPostsJson(e.target.value)}
                rows={6}
                placeholder='[
  {
    "post_id": "P001",
    "account_id": "account_alpha",
    "timestamp": "2026-11-13T10:00:00Z",
    "claim_id": "claim_bank_run",
    "media_hash": "sha256_sample_abc123",
    "language": "en",
    "platform": "twitter"
  },
  {
    "post_id": "P002",
    "account_id": "account_beta",
    "timestamp": "2026-11-13T10:01:30Z",
    "claim_id": "claim_bank_run",
    "media_hash": "sha256_sample_abc123",
    "language": "en",
    "platform": "twitter",
    "parent_post_id": "P001"
  }
]'
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 font-mono text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white"
              />
              <div className="text-[11px] text-slate-500 space-y-0.5">
                <p>• <strong>Required fields:</strong> <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">post_id</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">account_id</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">timestamp</code> (ISO-8601 with timezone).</p>
                <p>• <strong>Optional fields:</strong> <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">claim_id</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">media_hash</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">parent_post_id</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">platform</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">language</code>.</p>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <Link
            href="/"
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating Investigation...</span>
              </>
            ) : (
              <span>Launch Forensic Investigation →</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
