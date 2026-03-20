# Infrastructure

## Whisper CPU Service

- **Container name**: `whisper-ceg`
- **Health check**: `GET http://100.100.101.1:8200/` → returns HTTP 200 when healthy.
- **Transcription endpoint**: `POST http://100.100.101.1:8200/transcribe` (multipart form‑data, file key `file`).
- **Port**: `8200` (exposed on CEG).  The Whisper container listens on this port; `8000` is used by the local Chroma service.
- **Deployment**: The service is deployed on CEG via Docker and runs the Flask app exposed by `whisperx`.
- **Monitoring**: Health endpoint should be polled periodically; a 5xx or non‑200 response indicates a restart is needed.
