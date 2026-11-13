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

  const loadSampleSocialPosts = () => {
    const sample = [
      {
        post_id: 'P001',
        account_id: 'A01',
        timestamp: '2026-11-12T09:00:00Z',
        claim_id: 'CLAIM_BANK_01',
        language: 'en',
        media_hash: 'sha256_demo_bank_notice_01',
        activity: 'original_post',
      },
      {
        post_id: 'P002',
        account_id: 'A02',
        timestamp: '2026-11-12T09:01:00Z',
        claim_id: 'CLAIM_BANK_01',
        language: 'en',
        media_hash: 'sha256_demo_bank_notice_01',
        parent_post_id: 'P001',
        activity: 'repost',
      },
      {
        post_id: 'P003',
        account_id: 'A03',
        timestamp: '2026-11-12T09:02:00Z',
        claim_id: 'CLAIM_BANK_01',
        language: 'hi',
        media_hash: 'sha256_demo_bank_notice_01',
        parent_post_id: 'P002',
        activity: 'repost',
      },
      {
        post_id: 'P004',
        account_id: 'A04',
        timestamp: '2026-11-12T09:03:00Z',
        claim_id: 'CLAIM_BANK_01',
        language: 'te',
        media_hash: 'sha256_demo_bank_notice_01',
        parent_post_id: 'P003',
        activity: 'repost',
      },
      {
        post_id: 'P005',
        account_id: 'A05',
        timestamp: '2026-11-12T09:04:00Z',
        claim_id: 'CLAIM_BANK_01',
        language: 'en',
        media_hash: 'sha256_demo_bank_notice_01',
        parent_post_id: 'P004',
        activity: 'repost',
      },
    ];
    setSocialPostsJson(JSON.stringify(sample, null, 2));
    setIncludeSocialPosts(true);
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
        <Link href="/" className="text-xs text-cyan-400 hover:underline flex items-center gap-1 mb-2">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-100">Initiate Investigation</h1>
        <p className="text-sm text-slate-400 mt-1">
          Submit suspicious digital artifacts or multilingual social posts for real-time forensic detection.
        </p>
      </div>

      {/* Success banner */}
      {successInfo && (
        <div className="bg-emerald-950/80 border border-emerald-800 rounded-xl p-4 text-emerald-200 text-sm flex items-center justify-between">
          <div>
            <p className="font-bold">Investigation Created: {successInfo.id}</p>
            <p className="text-xs text-emerald-400">
              State: {successInfo.status} • Redirecting to real-time investigation dashboard...
            </p>
          </div>
          <span className="text-lg animate-spin">⏳</span>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="bg-rose-950/80 border border-rose-800 rounded-xl p-4 text-rose-200 text-sm">
          <p className="font-semibold flex items-center gap-1.5">
            <span>⚠️</span> Validation / Submission Error
          </p>
          <p className="text-xs text-rose-300 mt-1">{error}</p>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-800 pb-3 gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveTab('text');
              setError(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'text'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            📸 Media Upload (Image / Audio / Video)
          </button>
        </div>

        {/* Tab 1: Text Claim */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-1 tracking-wider">
                Suspicious Claim or Social Text <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                required
                placeholder="Example: A major bank will shut down tomorrow. Withdraw all money immediately. (Supports English, Hindi, and Telugu)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-1 tracking-wider">
                Language Hint (Optional)
              </label>
              <select
                value={languageHint}
                onChange={(e) => setLanguageHint(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
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
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-1 tracking-wider">
                Select Media File <span className="text-rose-400">*</span>
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png,.webp,.bmp,.wav,.mp3,.ogg,.flac,.m4a,.mp4,.avi,.mov,.webm,.mkv"
                className="block w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-950 file:text-cyan-300 file:border file:border-cyan-800 hover:file:bg-cyan-900 cursor-pointer bg-slate-950 border border-slate-800 rounded-lg p-2"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Supported: Images (.jpg, .png, .webp), Audio (.wav, .mp3, .flac), Video (.mp4, .mov). Max: 50MB.
              </p>
            </div>

            {selectedFile && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200">{selectedFile.name}</span>
                  <span className="text-slate-500 block">
                    {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'binary'}
                  </span>
                </div>
                <span className="text-emerald-400 font-medium">✓ Validated</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-1 tracking-wider">
                Accompanying Caption or Claim (Optional)
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Optional text caption that appeared with this media"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        )}

        {/* Optional Social Post Records for Network/Propagation */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <input
                type="checkbox"
                checked={includeSocialPosts}
                onChange={(e) => setIncludeSocialPosts(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-cyan-600 focus:ring-0"
              />
              Attach Social Post Records (Network & Propagation Intelligence)
            </label>

            {includeSocialPosts && (
              <button
                type="button"
                onClick={loadSampleSocialPosts}
                className="text-[11px] text-cyan-400 hover:underline font-mono"
              >
                + Load Labeled Demo Fixture
              </button>
            )}
          </div>

          {includeSocialPosts && (
            <div className="space-y-1.5 mt-2">
              <textarea
                value={socialPostsJson}
                onChange={(e) => setSocialPostsJson(e.target.value)}
                rows={6}
                placeholder='[{"post_id":"P001","account_id":"A01","timestamp":"2026-11-12T09:00:00Z","claim_id":"CLAIM_BANK_01","media_hash":"hash1"}]'
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-slate-300 placeholder-slate-700 focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[10px] text-slate-500">
                JSON array of post objects with account_id and ISO-8601 timestamp fields.
              </p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <Link
            href="/"
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-md transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center gap-2"
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
