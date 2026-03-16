---
name: stack-guidance
description: "Operational details for Zuberi's stack: Ollama server, OpenClaw container, ZuberiChat repo, and Docker. Use when troubleshooting services, restarting containers, running tests, checking system state, or needing dev conventions. Also activates for: 'how do I restart OpenClaw,' 'where is the config,' 'how to run tests,' 'what are the Docker safety rules,' or 'is the container healthy.' NOT for hardware inventory or network topology (use infrastructure skill)."
---

# Stack Guidance

Operational details for Zuberi's infrastructure components on KILO.

## Ollama (host.docker.internal:11434)

- **From host:** `localhost:11434`
- **From OpenClaw container:** `host.docker.internal:11434`
- **Models location:** `E:\ollama\models` (user-level `OLLAMA_MODELS` env var)
- **Runs as:** User process (not a Windows service). Auto-launched by ZuberiChat via `ensure_ollama()`.
- **CORS origins:** `OLLAMA_ORIGINS=http://tauri.localhost,http://localhost:3000` (set at User env level on KILO)
- **Native API only:** Use `/api/tags`, `/api/ps`, `/api/chat`, `/api/generate` — NOT `/v1` compatibility mode
- **Never pull models without confirmation** — pulls are large downloads that consume disk and bandwidth

### Common operations

```bash
# List installed models:
curl -s http://host.docker.internal:11434/api/tags
# Check loaded model (VRAM):
curl -s http://host.docker.internal:11434/api/ps
# Unload from VRAM:
curl -s http://host.docker.internal:11434/api/generate -d '{"model":"MODEL","prompt":"","stream":false,"keep_alive":"0"}'
```

## OpenClaw (localhost:18789)

- **Version:** v2026.3.1
- **Container:** `openclaw-openclaw-gateway-1`
- **Config:** `C:\Users\PLUTO\openclaw_config\openclaw.json` (volume-mounted)
- **Sandbox mode:** `non-main` — webchat runs at gateway level, bypassing `sandbox.docker.network=none`
- **Elevated exec:** Gateway-level exec has host network access including Tailscale to CEG
- **API mode:** `"ollama"` (native Ollama API, NOT `"openai-completions"`)
- **Model thinks natively** via Ollama template — no explicit `reasoning` flag needed
- **Restart drops all sessions** — confirm before `docker restart`
- **Health check:** `curl -s http://127.0.0.1:18789` (200 or 401 = healthy)
- **Dashboard:** `http://127.0.0.1:18789/#token=<GATEWAY_TOKEN>` (do NOT use `openclaw dashboard` CLI — port-127 bug)

### Gateway token

The active gateway token is the `OPENCLAW_GATEWAY_TOKEN` env var injected into the container. This MUST match `gateway.auth.token` in `openclaw.json`. External clients (`.openclaw.local.json`) must also match.

## ZuberiChat Repo

- **Path:** `C:\Users\PLUTO\github\Repo\ZuberiChat`
- **Stack:** Tauri v2 + React + TypeScript + Rust
- **Always run `git status` and `git log` before touching files**
- **Tests:** `pnpm test` — 155 smoke tests must pass before and after every change
- **Tauri IPC:** Use `invoke()` for JS↔Rust bridge — NOT `fetch()` or direct HTTP
- **Branch:** Work on `main` (no feature branches)
- **Never `git push` or `git reset --hard` without confirmation**
- **Config files:** `tauri.conf.json` and `package.json` edits require confirmation
- **Version:** `tauri.conf.json` is the canonical version source (not `Cargo.toml`)
- **Build:** `pnpm tauri build` → `scripts\verify-build.ps1` → NSIS installer in `src-tauri\target\release\bundle\nsis\`
- **Preview mode:** `pnpm dev` at `localhost:3000` — mock IPC handlers, no Tauri native shell needed

## Docker

- **Safe anytime:** `docker ps`, `docker logs --tail 50 <container>`, `docker inspect`
- **Confirm first:** `docker restart`, `docker stop`, `docker rm`
- **Never without explicit instruction:** `docker system prune`, `docker volume rm`
- **OpenClaw compose project:** `C:\Users\PLUTO\github\openclaw\` — `docker compose` commands run from there
- **Network:** OpenClaw container uses Docker bridge network. `sandbox.docker.network` must stay `"none"`.

## Known Issues

- OpenClaw does NOT support custom search/MCP via openclaw.json. Use workspace skills instead.
