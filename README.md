# 🎙️ PodEdu AI

**Turn YouTube videos into AI-powered podcast summaries with avatar video presentations**

PodEdu AI is a Next.js application that transcribes YouTube videos, generates intelligent summaries using AI, and creates engaging avatar video presentations using HeyGen's API.

## ✨ Features

- **YouTube Video Transcription**: Download and transcribe any YouTube video using Vosk (offline) or OpenAI Whisper
- **AI-Powered Summarization**: Generate concise podcast-style summaries using Google Gemini
- **Avatar Video Generation**: Create professional video presentations with HeyGen avatars
- **Multi-Engine Support**: Switch between Vosk (local/offline) and OpenAI Whisper for transcription
- **Top Avatar Selection**: Choose from top 3 available HeyGen avatars
- **Voice Selection**: Pick from top 2 voices for video generation
- **Real-time Status**: Track video generation progress with polling

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **AI/ML**: 
  - Google Gemini (summarization)
  - OpenAI Whisper (cloud transcription)
  - Vosk (offline transcription)
- **Media Processing**:
  - ytdl-core & yt-dlp (YouTube download)
  - FFmpeg (audio conversion)
- **Video Generation**: HeyGen API
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
3. View the transcript in the results section

### Step 2: Generate Summary
1. After transcription completes, click **Generate Summary**
2. Or enter a custom topic to generate a summary without video input
3. AI will create a concise podcast-style summary

### Step 3: Generate Avatar Video
1. Select an avatar from the dropdown (top 3 available)
2. Select a voice from the dropdown (top 2 available)
3. Click **Generate Video**
4. Wait for video processing (status updates every 2.5 seconds)
5. Watch the generated video when ready

## 🔧 API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/transcribe_youtube` | POST | Transcribe YouTube video via Vosk or Whisper |
| `/api/summarize` | POST | Generate summary from text using Gemini |
| `/api/generate_video` | POST | Create HeyGen avatar video from text |
| `/api/video_status` | GET | Poll HeyGen video generation status |
| `/api/avatars` | GET | List top 3 available HeyGen avatars |
| `/api/voices` | GET | List top 2 available HeyGen voices |
| `/api/chat` | POST | Original chat endpoint with Gemini + HeyGen |

## 🐛 Troubleshooting

### Empty Avatar/Voice Dropdowns
- Check HeyGen API key is valid
- Restart dev server: `npm run dev`
- Check browser console and Network tab for API errors

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

### Video Generation 404
- Restart dev server to pick up all API routes
- Ensure `src/pages/api/generate_video.js` exists

### FFmpeg Not Found
- Install: `brew install ffmpeg` (macOS)
- Verify: `ffmpeg -version`

## 📂 Project Structure

```
my-avatar-app/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main UI
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles
│   └── pages/
│       └── api/               # API routes
│           ├── transcribe_youtube.js
│           ├── summarize.js
│           ├── generate_video.js
│           ├── video_status.js
│           ├── avatars.js
│           ├── voices.js
│           └── chat.js
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
4. **Return**: Clean transcript text

### Summarization
- Uses Google Gemini with temperature 0.3 for consistent results
- Generates 5-6 bullet point summaries
- Optimized for podcast-style content

### Video Generation
- Queries HeyGen for available avatars and voices
- Sends summary text (max 800 chars) to HeyGen
- Polls status every 2.5s until video is ready
- Displays video with native HTML5 player

## 🤝 Contributing

This project was built for a hackathon. Feel free to fork and extend!

## 📄 License

MIT

## 🔗 References

- [HeyGen API Documentation](https://docs.heygen.com/)
- [Google Gemini API](https://ai.google.dev/)
- [OpenAI Whisper](https://openai.com/research/whisper)
- [Vosk Speech Recognition](https://alphacephei.com/vosk/)
- [Next.js Documentation](https://nextjs.org/docs)
