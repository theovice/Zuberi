# Whisper‑GPU service
# ---------------------
# A minimal Flask app that exposes a single POST endpoint /transcribe.
# The endpoint accepts a WebM audio file, decodes it to PCM,
# runs Whisper‑X on a GPU (requires CUDA), and returns JSON.
#
# 1. Install dependencies:
#    pip install torch==2.5.1+cu118 torchvision==0.20.1+cu118 torchaudio==2.5.1+cu118 -f https://download.pytorch.org/whl/torch_stable.html
#    pip install whisperx==3.12.0
#    pip install Flask==3.0.3
#    pip install ffmpeg-python==0.2.0
#
# 2. Ensure CUDA drivers and toolkit are installed on the host.
#    (See https://developer.nvidia.com/cuda-downloads for your distro.)
#
# 3. Run the server:
#    python3 server.py
#
# 4. Call it from the extension:
#    POST http://localhost:8000/transcribe with body=WebM file.
#    The response will be a JSON with fields: text, segments, speakers, speaker_count.

from flask import Flask, request, jsonify
import whisperx
import ffmpeg
import numpy as np
import wave
import tempfile
import os

app = Flask(__name__)

# Load the model once (GPU) – pick tiny.en for speed, base.en for better accuracy
MODEL_NAME = "tiny.en"  # change to "base.en", "small.en", etc. as needed
DEVICE = "cuda"  # "cpu" if you don't have a GPU
print(f"Loading Whisper‑X model {MODEL_NAME} on {DEVICE}…")
model = whisperx.load_model(MODEL_NAME, device=DEVICE)
print("Model loaded.")


def pcm_from_webm(webm_path: str) -> np.ndarray:
    """Decode a WebM file to a 16‑bit mono PCM numpy array (float32 in [-1,1])."""
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        # ffmpeg will convert WebM → 16‑kHz mono PCM WAV
        ffmpeg.input(webm_path).output(tmp.name, ac=1, ar=16000, format="wav").overwrite_output().run(quiet=True)
        with wave.open(tmp.name, "rb") as wf:
            pcm = wf.readframes(wf.getnframes())
            samples = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0
            return samples


def transcribe(pcm: np.ndarray):
    # Transcribe
    result = model.transcribe(pcm, language="en")
    # Diarize
    diarization = model.diarize(pcm, language="en")
    segments = []
    for seg in diarization["diarization_segments"]:
        speaker = seg["speaker"]
        text = seg["text"].strip()
        if text:
            segments.append({"speaker": speaker, "text": text, "start": seg["start"], "end": seg["end"]})
    transcript = " ".join([f"[{s['speaker']}] {s['text']}" for s in segments])
    return {
        "text": transcript,
        "segments": segments,
        "speakers": sorted(set(s["speaker"] for s in segments)),
        "speaker_count": len(set(s["speaker"] for s in segments)),
    }

@app.route("/transcribe", methods=["POST"])
def transcribe_endpoint():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400
    # Save temporarily
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name
    try:
        pcm = pcm_from_webm(tmp_path)
        out = transcribe(pcm)
        return jsonify(out)
    finally:
        os.remove(tmp_path)

if __name__ == "__main__":
    # Listen on 0.0.0.0:8000 so the Chrome extension can reach it
    app.run(host="0.0.0.0", port=8000, threaded=True)
