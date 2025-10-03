#!/usr/bin/env python3
import json
import os
import sys
import wave

try:
    from vosk import Model, KaldiRecognizer
except Exception as e:
    print(json.dumps({"error": f"vosk import failed: {e}", "hint": "pip3 install vosk"}))
    sys.exit(2)


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "missing wav path"}))
        sys.exit(2)

    wav_path = sys.argv[1]
    model_path = os.environ.get("VOSK_MODEL_PATH", "").strip()
    if not model_path:
        print(json.dumps({"error": "VOSK_MODEL_PATH is not set", "hint": "Download a model (e.g. vosk-model-small-en-us-0.15) and set VOSK_MODEL_PATH to its folder"}))
        sys.exit(2)

    if not os.path.isdir(model_path):
        print(json.dumps({"error": f"VOSK_MODEL_PATH not found: {model_path}"}))
        sys.exit(2)

    try:
        wf = wave.open(wav_path, "rb")
    except Exception as e:
        print(json.dumps({"error": f"failed to open wav: {e}"}))
        sys.exit(2)

    if wf.getnchannels() != 1 or wf.getsampwidth() not in (2, 4) or wf.getframerate() != 16000:
        # Vosk can handle multiple, but we expect 16k mono int16; warn only
        pass

    try:
        model = Model(model_path)
        rec = KaldiRecognizer(model, wf.getframerate())
        rec.SetWords(True)
        transcript_parts = []
        while True:
            data = wf.readframes(4000)
            if len(data) == 0:
                break
            if rec.AcceptWaveform(data):
                res = json.loads(rec.Result())
                if "text" in res and res["text"]:
                    transcript_parts.append(res["text"])
        final_res = json.loads(rec.FinalResult())
        if "text" in final_res and final_res["text"]:
            transcript_parts.append(final_res["text"])
        text = " ".join([t for t in transcript_parts if t]).strip()
        print(json.dumps({"transcript": text}))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"error": f"vosk recognition failed: {e}"}))
        sys.exit(2)


if __name__ == "__main__":
    main()


