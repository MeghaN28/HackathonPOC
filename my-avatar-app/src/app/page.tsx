"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Youtube, Brain, VideoIcon, Copy, CheckCircle } from "lucide-react";

export default function Home() {
  const [message, setMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [reply, setReply] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [avatarId, setAvatarId] = useState<string>("");
  const [voiceId, setVoiceId] = useState<string>("");
  const [availableAvatars, setAvailableAvatars] = useState<Array<{ avatar_id: string; name?: string }>>([]);
  const [availableVoices, setAvailableVoices] = useState<Array<{ voice_id: string; name?: string }>>([]);
  const [youtubeUrl, setYoutubeUrl] = useState<string>("");
  const [transcript, setTranscript] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [streaming, setStreaming] = useState(false);
  const [topic, setTopic] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearPoll = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearPoll();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const aResp = await fetch("/api/avatars", { cache: "no-store" });
        const aData = await aResp.json();
        if (!cancelled && aResp.ok) {
          const aItems = Array.isArray(aData?.data) ? aData.data : [];
          setAvailableAvatars(aItems as any);
          if (!avatarId && aItems[0]?.avatar_id) setAvatarId(aItems[0].avatar_id);
        }
      } catch {}
      try {
        const vResp = await fetch("/api/voices", { cache: "no-store" });
        const vData = await vResp.json();
        if (!cancelled && vResp.ok) {
          const vItems = Array.isArray(vData?.data) ? vData.data : [];
          setAvailableVoices(vItems as any);
          if (!voiceId && vItems[0]?.voice_id) setVoiceId(vItems[0].voice_id);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const pollStatus = useCallback((id: string) => {
    clearPoll();
    setStatusText("Processing video...");
    pollTimerRef.current = setInterval(async () => {
      try {
        const resp = await fetch(`/api/video_status?video_id=${encodeURIComponent(id)}`, { cache: "no-store" });
        const data = await resp.json();
        if (!resp.ok) {
          setStatusText("Error checking status");
          clearPoll();
          return;
        }
        const state = data?.data?.status || data?.status;
        const url = data?.data?.video_url || data?.video_url;
        const errorMessage = data?.data?.error?.message || data?.error?.message;
        if (state) setStatusText(String(state));
        if (state === "failed" && errorMessage) {
          setStatusText(`failed: ${errorMessage}`);
          clearPoll();
          return;
        }
        if (url && (state === "completed" || state === "success")) {
          setVideoUrl(url);
          clearPoll();
        }
      } catch {
        setStatusText("Network error while polling");
        clearPoll();
      }
    }, 2500);
  }, []);

  const onTranscribe = async () => {
    if (!youtubeUrl.trim()) return;
    setTranscript("");
    setSummary("");
    try {
      const resp = await fetch("/api/transcribe_youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtube_url: youtubeUrl.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setTranscript(`Error: ${data?.error || "Failed to transcribe"}`);
        return;
      }
      setTranscript(String(data?.transcript || ""));
    } catch {
      setTranscript("Network error while transcribing");
    }
  };

  const onSummarize = async () => {
    const inputText = transcript.trim() || topic.trim();
    if (!inputText) return;
    setSummary("");
    try {
      const resp = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText, max_sentences: 6 }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setSummary(`Error: ${data?.error || "Failed to summarize"}`);
        return;
      }
      setSummary(String(data?.summary || ""));
    } catch {
      setSummary("Network error while summarizing");
    }
  };

  const onStartStreaming = async () => {
    if (!summary.trim()) return;
    setStreaming(true);
    setVideoId(null);
    setVideoUrl(null);
    setStatusText(null);
    try {
      const resp = await fetch("/api/generate_video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: summary,
          ...(avatarId ? { avatar_id: avatarId } : {}),
          ...(voiceId ? { voice_id: voiceId } : {}),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        alert(`Generate video error: ${data?.error || "Unknown"}`);
        setStreaming(false);
        return;
      }
      if (data?.video_id) {
        setVideoId(data.video_id);
        pollStatus(data.video_id);
      }
    } catch {
      alert("Network error generating video");
    } finally {
      setStreaming(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-200 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900">🎙️ PodEdu AI</h1>
          <p className="text-gray-800 mt-2">Turn YouTube into AI-Powered Podcast Summaries</p>
        </header>

        {/* Stepper */}
        <div className="flex justify-between items-center mb-8">
          {["YouTube", "Summarize", "Avatar"].map((step, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <div className={`w-10 h-10 flex items-center justify-center rounded-full ${idx === 0 ? "bg-blue-600 text-white" : "bg-gray-300"}`}>
                {idx === 0 ? <Youtube /> : idx === 1 ? <Brain /> : <VideoIcon />}
              </div>
              <span className="text-xs mt-1 text-gray-800">{step}</span>
            </div>
          ))}
        </div>

        {/* Step 1 */}
        <div className="bg-white shadow-lg rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-lg mb-2 text-gray-900">📺 Step 1: Enter YouTube URL</h2>
          <div className="flex gap-2">
            <input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 border border-gray-400 rounded-lg px-3 py-2 focus:ring focus:ring-blue-200 text-gray-900 placeholder-gray-700"
            />
            <button onClick={onTranscribe} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              {submitting ? <Loader2 className="animate-spin" /> : "Transcribe"}
            </button>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white shadow-lg rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-lg mb-2 text-gray-900">🧠 Step 2: Summarize</h2>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Or enter a topic..."
            className="w-full border border-gray-400 rounded-lg px-3 py-2 mb-3 focus:ring focus:ring-blue-200 text-gray-900 placeholder-gray-700"
          />
          <button
            onClick={onSummarize}
            disabled={!transcript.trim() && !topic.trim()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Generate Summary
          </button>
        </div>

        {/* Step 3 */}
        <div className="bg-white shadow-lg rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-lg mb-2 text-gray-900">🎬 Step 3: Generate Avatar Video</h2>
          <select
            value={avatarId}
            onChange={(e) => setAvatarId(e.target.value)}
            className="w-full border border-gray-400 rounded-lg px-3 py-2 mb-3 text-gray-900"
          >
            {availableAvatars.map((a) => (
              <option key={a.avatar_id} value={a.avatar_id}>
                {a.name || a.avatar_id}
              </option>
            ))}
          </select>
          <select
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            className="w-full border border-gray-400 rounded-lg px-3 py-2 mb-3 text-gray-900"
          >
            {availableVoices.map((v) => (
              <option key={v.voice_id} value={v.voice_id}>
                {v.name || v.voice_id}
              </option>
            ))}
          </select>
          <button
            onClick={onStartStreaming}
            disabled={!summary.trim() || streaming}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            {streaming ? "Generating..." : "Generate Video"}
          </button>
        </div>

        {/* Results */}
        {transcript && (
          <div className="bg-white shadow-lg rounded-2xl p-6 mb-6">
            <h3 className="font-semibold mb-2 flex items-center justify-between text-gray-900">
              Transcript
              <button onClick={() => copyToClipboard(transcript)} className="text-gray-700 hover:text-gray-900">
                {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
              </button>
            </h3>
            <pre className="whitespace-pre-wrap text-sm bg-gray-100 text-gray-900 rounded p-3 max-h-60 overflow-auto">{transcript}</pre>
          </div>
        )}
        {summary && (
          <div className="bg-white shadow-lg rounded-2xl p-6 mb-6">
            <h3 className="font-semibold mb-2 text-gray-900">Summary</h3>
            <p className="text-sm bg-gray-100 text-gray-900 rounded p-3">{summary}</p>
          </div>
        )}
        {(videoId || statusText) && (
          <div className="bg-white shadow-lg rounded-2xl p-6">
            {statusText && <p className="mb-2 text-sm text-gray-900">Status: {statusText}</p>}
            {videoUrl && <video src={videoUrl} controls className="w-full rounded-lg shadow" />}
          </div>
        )}
      </div>
    </div>
  );
}
