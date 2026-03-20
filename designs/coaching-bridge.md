# Coaching Bridge — RTL-069

**Status:** Live | **Priority:** P0 → Complete | **Executor:** CC
**Created:** Session 23 | 2026-03-19
**Deployed:** Session 23 | 2026-03-20

---

## Purpose

Eliminate James as a copy-paste middleman between architect agents (Claude.ai) and Zuberi. Enable live coaching sessions where the architect writes a prompt, the bridge delivers it to Zuberi via OpenClaw's REST API, captures her response, and returns it.

---

## Architecture — Final (n8n Webhook)

The PowerShell polling approach was abandoned in favor of an n8n workflow — standard tooling, chat UX, no custom scripts.

```
Any machine on Tailscale
    ↓ POST {"message": "prompt"}
n8n Webhook (CEG:5678/webhook/coaching-bridge)
    ↓ HTTP Request node
OpenClaw REST API (KILO:18789/v1/chat/completions)
    ↓ full Zuberi: tools, memory, skills, identity
Zuberi responds
    ↓ Code node extracts response
n8n Respond to Webhook
    ↓ {"response": "Zuberi's answer"}
Caller receives response
```

### Endpoints

- **Webhook URL:** `http://100.100.101.1:5678/webhook/coaching-bridge`
  - Method: POST
  - Body: `{"message": "your question here"}`
  - Response: `{"response": "Zuberi's answer", "model": "openclaw:main"}`
- **n8n UI:** `http://100.100.101.1:5678` → Workflow: "Coaching Bridge — Architect ↔ Zuberi"
- **Workflow ID:** `LpIv6lL5I83wxwiY`

### Usage

From any machine on Tailscale:
```
curl -X POST http://100.100.101.1:5678/webhook/coaching-bridge \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello Zuberi"}'
```

### Workflow Nodes

1. **Webhook** — receives POST with `{"message": "..."}` 
2. **HTTP Request** — POST to OpenClaw `/v1/chat/completions` with Bearer token, model `openclaw:main`
3. **Code** — extracts `choices[0].message.content` with null-safety
4. **Respond to Webhook** — returns `{"response": "...", "model": "openclaw:main"}`

---

## Components

### 1. PowerShell Bridge Script (`coaching-bridge.ps1`)

Location: `C:\Users\PLUTO\openclaw_config\coaching-bridge\coaching-bridge.ps1`

Core loop:
1. Poll CEG inbox for new `.md` files via shell service HTTP
2. Read and sanitize the prompt
3. POST to OpenClaw `/v1/chat/completions` with Bearer token
4. Capture Zuberi's response
5. Base64 encode and write to CEG outbox via shell service
6. Log exchange to audit file
7. Sleep, repeat

### 2. CEG Directories

- `/opt/zuberi/data/coaching/inbox/` — architect drops prompts here ✅ (created)
- `/opt/zuberi/data/coaching/outbox/` — bridge writes responses here ✅ (created)
- `/opt/zuberi/data/coaching/audit/` — exchange log ✅ (created)

### 3. OpenClaw REST Endpoint

- URL: `http://localhost:18789/v1/chat/completions`
- Auth: `Authorization: Bearer <gateway-token>`
- Model: `openclaw:main`
- Config added: `gateway.http.endpoints.chatCompletions.enabled: true`
- Config added: `sandbox.mode: "off"` (required — sandbox spawns Docker which isn't available inside gateway container)
- Config backup: `openclaw.json.bak-pre-rest`

---

## How the Architect Uses It

From this Claude.ai session, the architect can:

**Write a prompt to Zuberi:**
```
bash_tool: curl -s -X POST http://100.100.101.1:3003/write -H "Content-Type: application/json" -d '{"path":"/opt/zuberi/data/coaching/inbox/001.md","content":"<prompt text>","mode":"overwrite"}'
```

**Read Zuberi's response:**
```
bash_tool: curl -s -X POST http://100.100.101.1:3003/command -H "Content-Type: application/json" -d '{"command":"ls /opt/zuberi/data/coaching/outbox/"}'
bash_tool: curl -s -X POST http://100.100.101.1:3003/command -H "Content-Type: application/json" -d '{"command":"cat /opt/zuberi/data/coaching/outbox/response_1_*.md"}'
```

James's only role: start the bridge script and monitor. The architect and Zuberi communicate directly.

---

## Security

| # | Threat | Mitigation |
|---|--------|------------|
| 1 | Unauthorized prompt in inbox | Future: auth token in file header. Current: CEG only reachable via Tailscale. |
| 2 | Prompt injection via response | Sanitize: strip known override patterns before returning to architect |
| 3 | Script tampering | SHA-256 hash verified on startup. Won't run if modified. |
| 4 | Runaway loop | Max 20 exchanges per session. Min 10s cooldown between exchanges. |
| 5 | Context exhaustion | Bridge doesn't monitor context — architect must manage. Future: check sessions endpoint. |
| 6 | Exfiltration | Script only communicates with CEG:3003 and localhost:18789. No other outbound. |
| 7 | Kill switch | Create `/opt/zuberi/data/coaching/STOP` on CEG — bridge halts immediately. |

---

## Deployment

1. Copy `coaching-bridge.ps1` to `C:\Users\PLUTO\openclaw_config\coaching-bridge\`
2. Set env var: `$env:OPENCLAW_GATEWAY_TOKEN = "<token>"`
3. Run: `pwsh C:\Users\PLUTO\openclaw_config\coaching-bridge\coaching-bridge.ps1`
4. Bridge starts polling. Drop prompts in inbox to begin.

---

## Important Note: Session Isolation

Each call to `/v1/chat/completions` is a **separate session**. The bridge does not maintain a persistent conversation with Zuberi — each prompt is independent. This means:

- Zuberi loads her root files fresh each call (AGENTS.md, MEMORY.md, etc.)
- There is no multi-turn conversation context between exchanges
- Each prompt must be self-contained or reference files/memory explicitly

To enable multi-turn coaching, future work would need to either maintain a message history array in the bridge script, or connect via WebSocket to maintain a persistent session.

---

## Saved Tasks (Deferred by bridge priority)

### yt-dlp install on CEG

```
curl -s -X POST http://100.100.101.1:3003/command -H "Content-Type: application/json" -d '{"command":"pip3 install --break-system-packages yt-dlp"}'
curl -s -X POST http://100.100.101.1:3003/command -H "Content-Type: application/json" -d '{"command":"yt-dlp --version"}'
```

### n8n tutorial playlist (9 videos)

https://www.youtube.com/watch?v=TFTLMQLozCI&list=PLlET0GsrLUL5bxmx5c1H1Ms_OtOPYZIEG
