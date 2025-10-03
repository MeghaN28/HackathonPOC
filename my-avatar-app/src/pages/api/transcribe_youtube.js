import ytdl from "ytdl-core";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const useVosk = (process.env.TRANSCRIBE_ENGINE || "vosk").toLowerCase() === "vosk";
  const openaiApiKey = process.env.OPENAI_API_KEY;

  try {
    const { youtube_url: youtubeUrl } = req.body || {};
    if (!youtubeUrl || typeof youtubeUrl !== "string" || !ytdl.validateURL(youtubeUrl)) {
      return res.status(400).json({ error: "Invalid or missing youtube_url" });
    }

    let file;
    // Use a tmp workspace for raw and transcoded audio
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yt-audio-"));
    let rawPath = "";
    try {
      const outPathRaw = path.join(tmpDir, "audio.webm");
      const audioStream = ytdl(youtubeUrl, {
        filter: "audioonly",
        quality: "highestaudio",
        highWaterMark: 1 << 25,
      });
      await new Promise((resolve, reject) => {
        const ws = fs.createWriteStream(outPathRaw);
        audioStream.pipe(ws);
        ws.on("finish", resolve);
        ws.on("error", reject);
        audioStream.on("error", reject);
      });
      rawPath = outPathRaw;
    } catch (dlErr) {
      // eslint-disable-next-line no-console
      console.warn("ytdl-core failed, trying yt-dlp fallback", dlErr);
      // Attempt fallback using system yt-dlp (requires user to install yt-dlp)
      try {
        const outTemplate = path.join(tmpDir, "audio.%(ext)s");
        const formatCandidates = [
          // Prefer extracting compressed audio to keep file small for ASR upload
          { fmt: "bestaudio/best", extract: true, audioFormat: "mp3" },
          { fmt: "bestaudio[ext=m4a]/bestaudio", extract: true, audioFormat: "m4a" },
          { fmt: "ba/b", extract: false },
          { fmt: "best", extract: false },
        ];
        let success = false;
        for (const opt of formatCandidates) {
          try {
            const args = [
              "-f",
              opt.fmt,
              "--no-playlist",
              "--no-warnings",
              "--ignore-config",
              // Extract and transcode to smaller audio when requested
              ...(opt.extract ? ["--extract-audio", "--audio-format", opt.audioFormat, "--audio-quality", "5"] : []),
              "-o",
              outTemplate,
              youtubeUrl,
            ];
            await new Promise((resolve, reject) => {
              const child = execFile("yt-dlp", args, (error) => {
                if (error) {
                  reject(error);
                  return;
                }
                resolve(0);
              });
              child.on("error", reject);
            });
            // Find the produced file (audio.*) in tmpDir
            const files = fs.readdirSync(tmpDir).filter((f) => f.startsWith("audio."));
            if (files.length > 0) {
              const producedPath = path.join(tmpDir, files[0]);
              rawPath = producedPath;
              success = true;
              break;
            }
          } catch (_) {
            // try next format candidate
          }
        }
        if (!success) {
          throw new Error("yt-dlp did not produce output");
        }
      } catch (ytdlpErr) {
        // eslint-disable-next-line no-console
        console.error("yt-dlp fallback failed", ytdlpErr);
        const hint = "Install yt-dlp: brew install yt-dlp (macOS) or pipx install yt-dlp";
        return res.status(502).json({
          error: "Failed to download audio from YouTube",
          details: String(ytdlpErr?.message || ytdlpErr),
          hint,
        });
      }
    }

    // If we have a raw path on disk, either use it directly if it's already in a friendly format,
    // or transcode to a small mono 16kHz MP3/WAV. If ffmpeg fails, fall back to yt-dlp extraction.
    if (rawPath) {
      const lower = rawPath.toLowerCase();
      if (lower.endsWith(".mp3") || lower.endsWith(".m4a")) {
        const readStream = fs.createReadStream(rawPath);
        file = await toFile(readStream, path.basename(rawPath));
        readStream.on("close", () => {
          try { if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath); fs.rmdirSync(tmpDir); } catch {}
        });
      } else {
        let outMp3 = path.join(tmpDir, "final.mp3");
        try {
          await new Promise((resolve, reject) => {
            const args = ["-y", "-i", rawPath, "-ac", "1", "-ar", "16000", "-b:a", "48k", outMp3];
            execFile("ffmpeg", args, (error) => {
              if (error) {
                reject(error);
                return;
              }
              resolve(0);
            }).on("error", reject);
          });
        } catch (txErr) {
          // Try yt-dlp extraction as a last resort
          try {
            const outTemplate = path.join(tmpDir, "extracted.%(ext)s");
            const args = [
              "--extract-audio", "--audio-format", "mp3", "--audio-quality", "5",
              "--no-playlist", "--no-warnings", "--ignore-config",
              "-o", outTemplate,
              youtubeUrl,
            ];
            await new Promise((resolve, reject) => {
              execFile("yt-dlp", args, (error) => {
                if (error) { reject(error); return; }
                resolve(0);
              }).on("error", reject);
            });
            const files = fs.readdirSync(tmpDir).filter((f) => f.startsWith("extracted."));
            if (files.length > 0) {
              outMp3 = path.join(tmpDir, files[0]);
            } else {
              throw new Error("yt-dlp extraction did not produce a file");
            }
          } catch (finalErr) {
            // eslint-disable-next-line no-console
            console.error("ffmpeg transcode failed and yt-dlp extraction failed", txErr, finalErr);
            return res.status(502).json({ error: "Failed to transcode audio (ffmpeg)", details: String(txErr?.message || txErr) });
          }
        }
        const readStream = fs.createReadStream(outMp3);
        file = await toFile(readStream, path.basename(outMp3));
        readStream.on("close", () => {
          try {
            if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath);
            if (fs.existsSync(outMp3)) fs.unlinkSync(outMp3);
            fs.rmdirSync(tmpDir);
          } catch {}
        });
      }
    }

    if (useVosk) {
      // Convert to 16k mono WAV for Vosk
      const wavPath = path.join(os.tmpdir(), `vosk-${Date.now()}.wav`);
      try {
        await new Promise((resolve, reject) => {
          const args = ["-y", "-i", rawPath || "-", "-ac", "1", "-ar", "16000", wavPath];
          execFile("ffmpeg", args, (error) => {
            if (error) { reject(error); return; }
            resolve(0);
          }).on("error", reject);
        });
      } catch (e) {
        return res.status(502).json({ error: "Failed to convert to WAV for Vosk", details: String(e?.message || e) });
      }
      try {
        const scriptPath = path.join(process.cwd(), "scripts", "transcribe_vosk.py");
        const py = process.env.PYTHON_BIN || "python3";
        const out = await new Promise((resolve, reject) => {
          execFile(py, [scriptPath, wavPath], { env: process.env }, (error, stdout, stderr) => {
            if (error) { reject(stderr || error); return; }
            resolve(stdout);
          });
        });
        try { fs.unlinkSync(wavPath); } catch {}
        const parsed = JSON.parse(String(out || "{}"));
        if (parsed?.error) {
          return res.status(502).json(parsed);
        }
        const text = String(parsed?.transcript || "").trim();
        return res.status(200).json({ transcript: text });
      } catch (e) {
        return res.status(500).json({ error: "Vosk execution failed", details: String(e) });
      }
    } else {
      if (!openaiApiKey) {
        return res.status(500).json({ error: "OPENAI_API_KEY is not configured" });
      }
      try {
        const openai = new OpenAI({ apiKey: openaiApiKey });
        const transcription = await openai.audio.transcriptions.create({
          model: "whisper-1",
          file,
          response_format: "json",
          temperature: 0.0,
        });
        const text = transcription?.text || transcription?.data?.text || "";
        if (!text) {
          return res.status(502).json({ error: "No transcript returned from Whisper", details: transcription });
        }
        return res.status(200).json({ transcript: text });
      } catch (asrErr) {
        // eslint-disable-next-line no-console
        console.error("OpenAI Whisper error", asrErr);
        const status = asrErr?.status || asrErr?.response?.status || 500;
        const details = asrErr?.response?.data || asrErr?.message || String(asrErr);
        return res.status(status).json({ error: "Transcription failed", details });
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("/api/transcribe_youtube error", error);
    return res.status(500).json({ error: "Internal Server Error", details: String(error?.message || error) });
  }
}


