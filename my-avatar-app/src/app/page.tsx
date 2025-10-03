"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMemo } from "react";

export default function Home() {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [avatarId, setAvatarId] = useState<string>("");
  const [voiceId, setVoiceId] = useState<string>("");
  const [availableAvatars, setAvailableAvatars] = useState<Array<{ avatar_id: string; pose_name?: string; normal_preview?: string }>>([]);
  const [youtubeUrl, setYoutubeUrl] = useState<string>("");
  const [transcript, setTranscript] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [streaming, setStreaming] = useState(false);
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
    // Load streaming avatars
    (async () => {
      try {
        const resp = await fetch("/api/streaming_avatars", { cache: "no-store" });
        const data = await resp.json();
        if (!resp.ok) return;
        const items = Array.isArray(data?.data) ? data.data : [];
        setAvailableAvatars(items);
      } catch {}
    })();
  }, []);

  const pollStatus = useCallback((id: string) => {
    clearPoll();
    setStatusText("Processing video...");
    pollTimerRef.current = setInterval(async () => {
      try {
        const resp = await fetch(`/api/video_status?video_id=${encodeURIComponent(id)}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (resp.status === 304) {
          return; // ignore and continue polling
        }
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
      } catch (e) {
        setStatusText("Network error while polling");
        clearPoll();
      }
    }, 3000);
  }, []);

  const onSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setReply(null);
    setVideoId(null);
    setVideoUrl(null);
    setStatusText(null);
    clearPoll();
    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          ...(avatarId ? { avatar_id: avatarId } : {}),
          ...(voiceId ? { voice_id: voiceId } : {}),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        const heygenDetails = data?.details ? `\nDetails: ${JSON.stringify(data.details)}` : "";
        setReply(`Error: ${data?.error || "Unknown error"}${heygenDetails}`);
        setSubmitting(false);
        return;
      }
      setReply(data?.reply_text || "");
      if (data?.video_id) {
        setVideoId(data.video_id);
        pollStatus(data.video_id);
      }
    } catch (err) {
      setReply("Network error");
    } finally {
      setSubmitting(false);
    }
  }, [message, pollStatus]);

  const onTranscribe = useCallback(async () => {
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
    } catch (e) {
      setTranscript("Network error while transcribing");
    }
  }, [youtubeUrl]);

  const onSummarize = useCallback(async () => {
    if (!transcript.trim()) return;
    setSummary("");
    try {
      const resp = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcript, max_sentences: 6 }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setSummary(`Error: ${data?.error || "Failed to summarize"}`);
        return;
      }
      setSummary(String(data?.summary || ""));
    } catch (e) {
      setSummary("Network error while summarizing");
    }
  }, [transcript]);

  const onStartStreaming = useCallback(async () => {
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
        const heygenDetails = data?.details ? `\nDetails: ${JSON.stringify(data.details)}` : "";
        alert(`Generate video error: ${data?.error || "Unknown"}${heygenDetails}`);
        setStreaming(false);
        return;
      }
      if (data?.video_id) {
        setVideoId(data.video_id);
        pollStatus(data.video_id);
      }
    } catch (e) {
      alert("Network error generating video");
    } finally {
      setStreaming(false);
    }
  }, [summary, avatarId, voiceId]);

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">HeyGen Gemini Demo</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-2 mb-4">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message"
          className="w-full border rounded px-3 py-2"
        />
        <div className="flex gap-2">
          <select
            value={avatarId}
            onChange={(e) => setAvatarId(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
          >
            <option value="">Default avatar (env)</option>
            {availableAvatars.map((a) => (
              <option key={a.avatar_id} value={a.avatar_id}>
                {a.pose_name || a.avatar_id}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            placeholder="Optional voice_id"
            className="flex-1 border rounded px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="border rounded px-4 py-2 bg-black text-white disabled:opacity-50"
          disabled={submitting}
        >
          {submitting ? "Sending..." : "Send"}
        </button>
      </form>

      {reply && (
        <div className="mb-4">
          <div className="font-medium mb-1">Generated reply</div>
          <div className="whitespace-pre-wrap border rounded p-3">{reply}</div>
        </div>
      )}

      {videoId && (
        <div className="mb-2 text-sm text-gray-600">Video ID: {videoId}</div>
      )}
      {statusText && (
        <div className="mb-4 text-sm">Status: {statusText}</div>
      )}

      {videoUrl && (
        <video src={videoUrl} controls className="w-full rounded border" />
      )}

      <hr className="my-6" />
      <h2 className="text-xl font-semibold mb-2">YouTube → Whisper → Summary → Stream Avatar</h2>
      <div className="flex flex-col gap-2 mb-3">
        <input
          type="text"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="Paste YouTube URL"
          className="w-full border rounded px-3 py-2"
        />
        <div className="flex gap-2">
          <button
            onClick={onTranscribe}
            className="border rounded px-4 py-2 bg-black text-white"
          >
            Transcribe
          </button>
          <button
            onClick={onSummarize}
            className="border rounded px-4 py-2 bg-black text-white disabled:opacity-50"
            disabled={!transcript.trim()}
          >
            Summarize
          </button>
          <button
            onClick={onStartStreaming}
            className="border rounded px-4 py-2 bg-black text-white disabled:opacity-50"
            disabled={!summary.trim() || streaming}
          >
            {streaming ? "Starting..." : "Stream Avatar"}
          </button>
        </div>
      </div>
      {transcript && (
        <div className="mb-4">
          <div className="font-medium mb-1">Transcript</div>
          <div className="whitespace-pre-wrap border rounded p-3 max-h-60 overflow-auto">{transcript}</div>
        </div>
      )}
      {summary && (
        <div className="mb-4">
          <div className="font-medium mb-1">Summary</div>
          <div className="whitespace-pre-wrap border rounded p-3">{summary}</div>
        </div>
      )}
    </div>
  );
}
