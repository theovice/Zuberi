# Session 23 — Architect Handoff

## Immediate Task: Whisper CPU Service on CEG

Zuberi has been trying to deploy a Whisper transcription service on CEG for 10+ turns and keeps hitting the same behavioral loop. Here's the exact state:

### What exists:
- `/opt/zuberi/whisper/Dockerfile` on CEG — NEEDS UPDATE (change `torch==2.5.1+cpu` to `torch==2.5.1`)
- `/opt/zuberi/whisper/server.py` — DOES NOT EXIST, needs to be written
- Chrome extension source: `C:\Users\PLUTO\openclaw_workspace\docs\Research\TabAudioRecorder\`
- Extension needs: host_permissions for `http://100.100.101.1:8000/*`, POST URL changed to `http://100.100.101.1:8000/transcribe`
- Docker on CEG is configured with Squid proxy, can pull images (verified: `python:3.10-slim` pulled successfully)
- Squid whitelist includes `download.pytorch.org` and `docker-images-prod...r2.cloudflarestorage.com`

### What needs to happen (in order):
1. Write the corrected Dockerfile to `/opt/zuberi/whisper/Dockerfile` on CEG
2. Write `server.py` to `/opt/zuberi/whisper/server.py` on CEG
3. Build the Docker image: `docker build -t whisper-ceg /opt/zuberi/whisper/`
4. Run the container: `docker run -d --name whisper-ceg -p 8000:8000 whisper-ceg`
5. Test the endpoint: `curl http://100.100.101.1:8000/`
6. Load the Chrome extension into Kasm browser (localhost:6901, kasm_user/zuberi2026)
7. Test end-to-end with a short YouTube clip

### The corrected Dockerfile:
```dockerfile
FROM python:3.10-slim
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
RUN pip install torch==2.5.1 -f https://download.pytorch.org/whl/torch_stable.html
RUN pip install whisperx flask ffmpeg-python
WORKDIR /app
COPY server.py /app/server.py
EXPOSE 8000
CMD ["python3", "server.py"]
```

### The server.py:
```python
from flask import Flask, request, jsonify
import whisperx
import tempfile
import os

app = Flask(__name__)
model = None

def get_model():
    global model
    if model is None:
        model = whisperx.load_model("base", device="cpu", compute_type="int8")
    return model

@app.route("/transcribe", methods=["POST"])
def transcribe():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    audio_file = request.files["file"]
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name
    
    try:
        m = get_model()
        audio = whisperx.load_audio(tmp_path)
        result = m.transcribe(audio, batch_size=4)
        text = " ".join([seg["text"] for seg in result["segments"]])
        return jsonify({"text": text, "segments": result["segments"]})
    finally:
        os.unlink(tmp_path)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
```

### Why Zuberi keeps failing at this:
Zuberi has a persistent behavioral bug where she:
1. Uses `dispatch` skill (NOT LOADED in current sessions) instead of `exec` tool
2. Runs commands with `host: "gateway"` (inside her container on KILO) instead of curling CEG's shell service at :3003
3. Claims things don't exist without checking (says directory doesn't exist, then verifies it does)
4. Claims she's "blocked" without trying alternatives
5. Asks "shall I proceed?" instead of executing

The AGENTS.md has been updated with WORK STYLE, MEMORY RECALL, and EXECUTION DISCIPLINE rules to address this. She may need a `/reset` to pick up the latest AGENTS.md.

### The pattern that works for Zuberi on CEG:
```
# Write a file to CEG:
exec: curl -s -X POST http://100.100.101.1:3003/write -H "Content-Type: application/json" -d '{"path":"/opt/zuberi/whisper/server.py","content":"<content>","mode":"overwrite"}'

# Run a command on CEG:
exec: curl -s -X POST http://100.100.101.1:3003/command -H "Content-Type: application/json" -d '{"command":"<command>"}'
```

**WARNING:** Nested JSON escaping breaks the Ollama tool call parser. If Zuberi can't construct the curl command with embedded JSON, the fastest path is a ccode prompt or James SSHing into CEG.

### ccode prompt approach (recommended):
Write both files and build the container via ccode. Zuberi's nested JSON escaping issues with the tool call parser make this the most reliable path. The ccode prompt should:
1. SSH into CEG
2. Write both files
3. Build the Docker image
4. Start the container
5. Verify it's running
6. Update the Chrome extension manifest and background.js
7. Test the endpoint

## Other Active Work

### Mission Ganesha Revenue Research
Zuberi completed Phase 2 (5 search queries). Phase 3 (fetch + synthesize) in progress. Output goes to `docs/research/revenue-streams.md`. Check in on progress.

### n8n Workflow Integration
- Zuberi → n8n: already works
- n8n → Zuberi: OpenClaw hooks endpoint NOT YET enabled. Design exists — add `hooks` section to openclaw.json
- Scheduled research workflow: designed but not built

### IPv6 iptables Hardening
- IPv4 rules working
- IPv6 bypass exists — deep research submitted but results not applied
- Not urgent but leaving a gap in CEG's egress security

### Hardware Change Coming
- RTX 3090 arriving in ~1 week, replacing RTX 5070 Ti
- RTX 3060 (8GB) coming out of storage
- Multi-GPU Ollama config needed when hardware arrives
- 24GB + 8GB = 32GB total, both Ampere

## Priority Order
1. Whisper MVP on CEG (immediate — blocked task)
2. Mission Ganesha research continuation
3. n8n hooks enablement
4. IPv6 iptables fix
5. Multi-GPU prep (when hardware arrives)
