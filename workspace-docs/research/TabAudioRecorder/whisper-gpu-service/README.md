# Instructions for running the Whisper‑GPU service
# -------------------------------------------------
# 1.  Ensure you have CUDA‑enabled hardware and drivers.
# 2.  Create a virtual environment and install dependencies:
#     ```bash
#     python3 -m venv ~/venvs/whisper_gpu
#     source ~/venvs/whisper_gpu/bin/activate
#     pip install torch==2.5.1+cu118 torchvision==0.20.1+cu118 torchaudio==2.5.1+cu118 -f https://download.pytorch.org/whl/torch_stable.html
#     pip install whisperx==3.12.0 flask==3.0.3 ffmpeg-python==0.2.0
#     ```
# 3.  Run the server:
#     ```bash
#     python3 docs/whisper-gpu-service/server.py
#     ```
# 4.  The extension should POST to `http://localhost:8000/transcribe` with a `file` field containing the WebM chunk.
# 5.  The response will be JSON with keys: text, segments, speakers, speaker_count.
