'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createInvestigationText,
  createInvestigationMedia,
} from '@/lib/api';

type InvestigationChoice = 'media' | 'claim' | 'social';

export default function NewInvestigationPage() {
  const router = useRouter();

  // Active investigation mode
  const [activeTab, setActiveTab] = useState<InvestigationChoice>('media');

  // Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statementText, setStatementText] = useState('');
  const [socialPostsJson, setSocialPostsJson] = useState('');
  const [languageHint, setLanguageHint] = useState<string>('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File size & format constants
  const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
  const ALLOWED_EXTENSIONS = {
    image: ['.jpg', '.jpeg', '.png', '.webp', '.bmp'],
    audio: ['.wav', '.mp3', '.flac', '.ogg', '.m4a'],
    video: ['.mp4', '.avi', '.mov', '.webm', '.mkv'],
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 50MB limit.`);
      e.target.value = '';
      setSelectedFile(null);
      return;
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const allAllowed = [
      ...ALLOWED_EXTENSIONS.image,
      ...ALLOWED_EXTENSIONS.audio,
      ...ALLOWED_EXTENSIONS.video,
    ];

    if (!allAllowed.includes(ext)) {
      setError(`File format '${ext}' is not supported. Allowed formats: ${allAllowed.join(', ')}`);
      e.target.value = '';
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleSocialJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setSocialPostsJson(content);
    };
    reader.readAsText(file);
  };

  const validateSocialPosts = (jsonString: string): Record<string, unknown>[] => {
    if (!jsonString.trim()) {
      throw new Error('Please enter or upload social-post records in JSON format.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error('Invalid JSON format. Please ensure the records form a valid JSON array.');
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Social activity dataset must be a non-empty array of post objects.');
    }

    // Validate required fields
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (!item || typeof item !== 'object') {
        throw new Error(`Item ${i + 1} is not a valid post object.`);
      }
      if (!item.post_id) {
        throw new Error(`Record ${i + 1} is missing required field: 'post_id'.`);
      }
      if (!item.account_id) {
        throw new Error(`Record ${i + 1} (${item.post_id}) is missing required field: 'account_id'.`);
      }
      if (!item.timestamp) {
        throw new Error(`Record ${i + 1} (${item.post_id}) is missing required field: 'timestamp'.`);
      }
      const parsedDate = Date.parse(item.timestamp);
      if (isNaN(parsedDate)) {
        throw new Error(
          `Record ${i + 1} (${item.post_id}) has an invalid ISO-8601 timestamp: '${item.timestamp}'.`
        );
      }
    }

    return parsed as Record<string, unknown>[];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let result: { investigation_id: string };

      if (activeTab === 'media') {
        if (!selectedFile) {
          throw new Error('Please select an image, audio, or video file to analyze.');
        }
        result = await createInvestigationMedia(
          selectedFile,
          statementText.trim() || undefined,
          languageHint || undefined
        );
      } else if (activeTab === 'claim') {
        if (!statementText.trim()) {
          throw new Error('Please enter a statement or news claim to verify.');
        }
        result = await createInvestigationText(
          statementText.trim(),
          languageHint || undefined
        );
      } else {
        // social
        const validatedPosts = validateSocialPosts(socialPostsJson);
        result = await createInvestigationText(
          statementText.trim() || 'Social activity coordination and propagation analysis',
          languageHint || undefined,
          validatedPosts
        );
      }

      router.push(`/investigations/${result.investigation_id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Investigation creation failed. Please check inputs.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/" className="hover:text-slate-800">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">New Investigation</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Start New Investigation
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Select what you would like to analyze below.
          </p>
        </div>
      </div>

      {/* Choice Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab('media');
            setError(null);
          }}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'media'
              ? 'bg-white border-teal-700 ring-2 ring-teal-700/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
          }`}
        >
          <span className="text-lg block mb-1">📷</span>
          <span className="font-bold text-slate-900 text-sm block">A. Check Media</span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Upload an image, video, or supported WAV audio file for authenticity analysis.
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('claim');
            setError(null);
          }}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'claim'
              ? 'bg-white border-teal-700 ring-2 ring-teal-700/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
          }`}
        >
          <span className="text-lg block mb-1">📝</span>
          <span className="font-bold text-slate-900 text-sm block">B. Verify a Claim</span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Enter or paste a statement in English, Hindi, or Telugu to extract and verify factual claims.
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('social');
            setError(null);
          }}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'social'
              ? 'bg-white border-teal-700 ring-2 ring-teal-700/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
          }`}
        >
          <span className="text-lg block mb-1">🌐</span>
          <span className="font-bold text-slate-900 text-sm block">C. Analyze Social Activity</span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Upload or paste social-post records to detect account coordination clusters and repost spread.
          </span>
        </button>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-rose-800 text-xs flex items-start gap-2">
            <span className="text-sm">⚠️</span>
            <div>
              <p className="font-semibold">Unable to start investigation</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Workflow A: Check Media */}
        {activeTab === 'media' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Select Media File <span className="text-rose-600">*</span>
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png,.webp,.bmp,.wav,.mp3,.ogg,.flac,.m4a,.mp4,.avi,.mov,.webm,.mkv"
                className="block w-full text-xs text-slate-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer bg-slate-50 border border-slate-300 rounded-lg p-2"
              />
              <div className="text-[11px] text-slate-500 mt-2 space-y-0.5">
                <p>• <strong>Supported formats:</strong> Images (.jpg, .png, .webp, .bmp), Audio (Uncompressed .wav recommended; .mp3, .flac), Video (.mp4, .mov, .avi).</p>
                <p>• <strong>Maximum file size:</strong> 50 MB.</p>
              </div>
            </div>

            {selectedFile && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <span className="font-semibold text-slate-800 block">Selected File:</span>
                <p className="text-slate-600 font-mono text-[11px]">
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Optional Context or Accompanying Caption
              </label>
              <textarea
                value={statementText}
                onChange={(e) => setStatementText(e.target.value)}
                rows={2}
                placeholder="E.g., Claim caption attached to this image on social media..."
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-700"
              />
            </div>
          </div>
        )}

        {/* Workflow B: Verify a Claim */}
        {activeTab === 'claim' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Statement or News Claim <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={statementText}
                onChange={(e) => setStatementText(e.target.value)}
                rows={4}
                required
                placeholder="Enter or paste the claim in English, Hindi, or Telugu (e.g., 'Reserve Bank of India announced all 2000 rupee notes are demonetized today.')"
                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-700"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                The platform extracts verifiable assertions, extracts key dates and numbers, and checks third-party evidence.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Language
                </label>
                <select
                  value={languageHint}
                  onChange={(e) => setLanguageHint(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:border-teal-700"
                >
                  <option value="">Auto-Detect (Recommended)</option>
                  <option value="en">English</option>
                  <option value="hi">Hindi (हिंदी)</option>
                  <option value="te">Telugu (తెలుగు)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Workflow C: Analyze Social Activity */}
        {activeTab === 'social' && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800">
                  Provide Dataset (Paste JSON or Upload File) <span className="text-rose-600">*</span>
                </span>
                <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-teal-900 bg-white px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-100 transition-colors">
                  <span>📁 Upload JSON File</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleSocialJsonUpload}
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
    "language": "en"
  },
  {
    "post_id": "P002",
    "account_id": "account_beta",
    "timestamp": "2026-11-13T10:01:30Z",
    "parent_post_id": "P001",
    "language": "en"
  }
]'
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 font-mono text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-700"
              />
              <div className="text-[11px] text-slate-500 space-y-0.5">
                <p>• <strong>Required fields:</strong> <code className="bg-slate-200 px-1 py-0.2 rounded text-slate-800">post_id</code>, <code className="bg-slate-200 px-1 py-0.2 rounded text-slate-800">account_id</code>, <code className="bg-slate-200 px-1 py-0.2 rounded text-slate-800">timestamp</code> (ISO-8601 with timezone).</p>
                <p>• <strong>Optional fields:</strong> <code className="bg-slate-200 px-1 py-0.2 rounded text-slate-800">parent_post_id</code>, <code className="bg-slate-200 px-1 py-0.2 rounded text-slate-800">claim_id</code>, <code className="bg-slate-200 px-1 py-0.2 rounded text-slate-800">media_hash</code>, <code className="bg-slate-200 px-1 py-0.2 rounded text-slate-800">platform</code>, <code className="bg-slate-200 px-1 py-0.2 rounded text-slate-800">language</code>.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Optional Narrative Context for this Campaign
              </label>
              <input
                type="text"
                value={statementText}
                onChange={(e) => setStatementText(e.target.value)}
                placeholder="E.g., Coordinated disinformation spreading across social accounts"
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-700"
              />
            </div>
          </div>
        )}

        {/* Submit Button & Progress Indicator */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Analyzing input...</span>
              </>
            ) : (
              <span>Analyze Input →</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
