# 🎙️ PodEdu AI

**Turn YouTube videos into AI-powered podcast summaries with live streaming avatar presentations**

PodEdu AI is a Next.js application that transcribes YouTube videos, generates intelligent summaries using AI, and creates engaging real-time streaming avatar presentations using HeyGen's Streaming Avatar SDK.

## ✨ Features

- **YouTube Video Transcription**: Download and transcribe any YouTube video using Vosk (offline) or OpenAI Whisper
- **AI-Powered Summarization**: Generate concise podcast-style summaries using Google Gemini (no markdown/bullets, natural speech)
- **Live Streaming Avatars**: Real-time interactive avatars that speak your summary instantly (2-3 seconds vs minutes)
- **Multi-Engine Support**: Switch between Vosk (local/offline) and OpenAI Whisper for transcription
- **Interactive UI**: Visual step indicators that highlight active sections
- **Instant Playback**: Watch avatars speak live without waiting for video rendering

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **AI/ML**: 
  - Google Gemini (podcast-style summarization)
  - OpenAI Whisper (cloud transcription)
  - Vosk (offline transcription)
- **Media Processing**:
  - ytdl-core & yt-dlp (YouTube download)
  - FFmpeg (audio conversion)
- **Streaming Avatars**: 
  - HeyGen Streaming Avatar SDK
  - LiveKit (WebRTC streaming)
- **UI Icons**: Lucide React

## 📋 Prerequisites

### Required
- Node.js 18+ 
- npm or yarn
- HeyGen API Key
- Google Gemini API Key

### For Transcription (choose one)
**Option 1: Vosk (Offline - Recommended)**
- Python 3.7+
- `pip3 install vosk`
- Download Vosk model: [vosk-model-small-en-us-0.15](https://alphacephei.com/vosk/models)

**Option 2: OpenAI Whisper (Cloud)**
- OpenAI API Key

### System Tools
- `yt-dlp`: `brew install yt-dlp` (macOS) or [install guide](https://github.com/yt-dlp/yt-dlp#installation)
- `ffmpeg`: `brew install ffmpeg` (macOS)

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd my-avatar-app
npm install
```

### 2. Environment Setup

Create `.env.local` in the project root:

```env
# Required
HEYGEN_API_KEY=your_heygen_api_key
GEMINI_API_KEY=your_gemini_api_key

# Transcription Engine (default: vosk)
TRANSCRIBE_ENGINE=vosk

# Vosk Configuration (if using vosk)
VOSK_MODEL_PATH=/absolute/path/to/vosk-model-small-en-us-0.15
PYTHON_BIN=python3

# OpenAI Whisper (if using whisper)
# TRANSCRIBE_ENGINE=whisper
# OPENAI_API_KEY=your_openai_api_key

# Optional Defaults
HEYGEN_AVATAR_ID=default_avatar_id
HEYGEN_VOICE_ID=default_voice_id
GEMINI_MODEL=gemini-2.5-flash-lite
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 How to Use

### Step 1: YouTube Video Transcription
1. Paste a YouTube URL in the input field
2. Click **Transcribe** to download and transcribe the audio
3. View the transcript in the results section (with copy-to-clipboard)

### Step 2: Generate Summary
1. After transcription completes, click **Generate Summary**
2. Or enter a custom topic to generate a summary without video input
3. AI will create a natural, podcast-style summary (conversational tone, no bullet points)

### Step 3: Start Streaming Avatar
1. Select a streaming avatar from the dropdown (loads top 3 on page load)
2. Click **Start Streaming Avatar**
3. Avatar connects in 2-3 seconds and begins speaking your summary live
4. Watch the real-time streaming video
5. Click **Stop Avatar** to end the session

## 🔧 API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/transcribe_youtube` | POST | Transcribe YouTube video via Vosk or Whisper |
| `/api/summarize` | POST | Generate podcast-style summary from text using Gemini |
| `/api/heygen_stream_token` | POST | Get streaming avatar access token |
| `/api/streaming_avatars` | GET | List available HeyGen streaming avatars |
| `/api/voices` | GET | List top 2 available HeyGen voices |
| `/api/generate_video` | POST | (Legacy) Create HeyGen avatar video from text |
| `/api/video_status` | GET | (Legacy) Poll HeyGen video generation status |
| `/api/chat` | POST | Original chat endpoint with Gemini + HeyGen |

## 🐛 Troubleshooting

### Empty Avatar Dropdown
- Check HeyGen API key is valid
- Restart dev server: `npm run dev`
- Check browser console for logs: `"Streaming avatars response:"`
- Check Network tab for `/api/streaming_avatars` response

### Streaming Avatar Errors

**"invalid voice settings":**
- Streaming avatars use built-in voices (no voice selection needed)
- Don't pass voice parameters to streaming avatar API

**"API request failed with status 400":**
- Verify streaming token endpoint is working: `curl -X POST http://localhost:3000/api/heygen_stream_token`
- Check browser console for detailed error messages
- Ensure avatarName is valid (from streaming avatars list)

**Video stream not showing:**
- Check browser console for WebRTC/LiveKit errors
- Ensure browser has camera/microphone permissions (for WebRTC)
- Try a different browser (Chrome recommended)

### YouTube Download Fails
- Some videos are region-locked or age-restricted
- Install `yt-dlp`: `brew install yt-dlp`
- Try a different video URL

### Transcription Errors

**Vosk Issues:**
- Ensure Python 3 is installed: `python3 --version`
- Install Vosk: `pip3 install vosk`
- Download and set `VOSK_MODEL_PATH` to unzipped model folder
- Check script permissions: `chmod +x scripts/transcribe_vosk.py`

**Whisper Issues:**
- Verify `OPENAI_API_KEY` is set and valid
- Check network connectivity to `api.openai.com`
- Set `HTTPS_PROXY` if behind corporate proxy

### FFmpeg Not Found
- Install: `brew install ffmpeg` (macOS)
- Verify: `ffmpeg -version`

## 📂 Project Structure

```
my-avatar-app/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main UI with streaming avatar integration
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles
│   └── pages/
│       └── api/               # API routes
│           ├── transcribe_youtube.js    # YouTube transcription (Vosk/Whisper)
│           ├── summarize.js             # Gemini podcast-style summarization
│           ├── heygen_stream_token.js   # HeyGen streaming token
│           ├── streaming_avatars.js     # List streaming avatars
│           ├── voices.js                # List voices
│           ├── generate_video.js        # (Legacy) Video generation
│           ├── video_status.js          # (Legacy) Video status polling
│           └── chat.js                  # Original chat endpoint
├── scripts/
│   └── transcribe_vosk.py    # Python Vosk transcriber
├── .env.local                 # Environment variables (create this)
└── package.json
```

## 🎯 Key Features Explained

### Transcription Pipeline
1. **Download**: ytdl-core attempts download; yt-dlp fallback if needed
2. **Convert**: FFmpeg converts to 16kHz mono WAV/MP3
3. **Transcribe**: Vosk (local) or Whisper (cloud) processes audio
4. **Return**: Clean transcript text with copy-to-clipboard

### Summarization
- Uses Google Gemini with temperature 0.3 for consistent results
- Generates natural, conversational podcast-style narration
- NO bullet points, asterisks, or markdown formatting
- Flows like spoken dialogue, optimized for avatar speech

### Streaming Avatar System
1. **Token**: Request streaming access token from HeyGen API
2. **Session**: Create StreamingAvatar instance with LiveKit WebRTC
3. **Stream**: Avatar connects in 2-3 seconds, displays live video feed
4. **Speak**: Send summary text, avatar speaks in real-time
5. **Interactive**: Can send multiple messages to same session
6. **Cleanup**: Stop avatar session when done

### Why Streaming > Video Generation?
- ⚡ **Speed**: 2-3 seconds vs 2-5 minutes
- 🎭 **Interactive**: Real-time responses, not pre-rendered
- 💰 **Cost**: Lower per-session cost
- 🔄 **Reusable**: One session handles multiple speak commands

## 🤝 Contributing

This project was built for a hackathon. Feel free to fork and extend!

## 📄 License

MIT

## 🔗 References

- [HeyGen Streaming Avatar SDK Documentation](https://docs.heygen.com/docs/streaming-avatar-sdk)
- [HeyGen API Documentation](https://docs.heygen.com/)
- [LiveKit WebRTC](https://livekit.io/)
- [Google Gemini API](https://ai.google.dev/)
- [OpenAI Whisper](https://openai.com/research/whisper)
- [Vosk Speech Recognition](https://alphacephei.com/vosk/)
- [Next.js Documentation](https://nextjs.org/docs)
