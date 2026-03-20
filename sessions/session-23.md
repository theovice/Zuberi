# Session 23 — Architect 23

**Date:** 2026-03-19 to 2026-03-20
**Commits:** 6fa7656, 8307cfe, 9c1595e, c099018, 89a8533, ce91be6, 4f1d305, 5f21424

## Completed

### Whisper CPU Service (CEG:8200)
- Deployed via ccode: Dockerfile corrected (torch==2.5.1, not +cpu), server.py with health endpoint added
- Port 8200 (moved off 8000 to avoid Chroma conflict, 8100 reserved for RTL-058)
- Container: whisper-ceg, image: whisper-ceg:latest
- Health check verified: `{"status": "ok", "service": "whisper-ceg"}`
- Zuberi updated infrastructure skill and verified endpoint

### CEG Squid Proxy — YouTube Whitelisted
- Added YouTube domains to /etc/squid/whitelist_domains.txt: youtube.com, www.youtube.com, m.youtube.com, youtu.be, googlevideo.com, .googlevideo.com, ytimg.com, .ytimg.com, i.ytimg.com, yt3.ggpht.com
- Squid reloaded, YouTube reachable from CEG

### AGENTS.md Updates
- Turn budget: 9 exec calls per task + anti-loop rule (same error twice = mandatory pivot)
- Context management: 80% usage → finish current step, write to MEMORY.md, /reset
- Dispatch reference fixed: removed "Always use your dispatch skill", replaced with direct curl pattern to :3003
- All shipped via ccode, verified

### OpenClaw REST Endpoint Enabled
- `/v1/chat/completions` enabled in openclaw.json: `gateway.http.endpoints.chatCompletions.enabled: true`
- `sandbox.mode` set to `"off"` (required — sandbox spawns Docker which isn't available inside gateway)
- Config backup: openclaw.json.bak-pre-rest
- Auth: Bearer token (gateway.token)
- Model: `openclaw:main` routes through full Zuberi agent pipeline
- Both streaming and non-streaming confirmed working
- Zuberi responds with full identity (name, model, context loaded)

### Coaching Bridge (RTL-069)
- Design complete: PowerShell script on KILO polls CEG inbox, POSTs to OpenClaw REST API, captures response, writes to CEG outbox
- No UI automation needed — pure HTTP
- Security: hash verification, prompt sanitization, rate limiting (20 max, 10s cooldown), kill switch, audit log
- Script written (coaching-bridge.ps1), deployment in progress
- CEG directories created: /opt/zuberi/data/coaching/inbox/, outbox/, audit/
- End-to-end data path proven: CEG → KILO → OpenClaw → Zuberi → CEG round-trip works

### Workspace Integrity Monitor (RTL-068)
- Design complete: n8n workflow to checksum root files every 4 hours, alert via email if >50% size drop
- Session closing checklist added to AGENT-BOOTSTRAP.md (mandatory for all future architects)
- Triggered by Session 23 audit discovering gutted infrastructure skill and wiped corrections log

### RTX 3090 Upgrade Checklist
- Created at designs/rtx3090-upgrade-checklist.md
- Covers: hardware swap, Ollama multi-GPU, AGENTS.md turn budget increase (9→15), model upgrades, context tuning, Whisper GPU evaluation

### Phase Enlightenment — Jehudiel
- Learning protocol designed: James selects sources → Zuberi acquires (yt-dlp/Whisper) → structured extraction → integration
- RTL-066 added, design at designs/jehudiel-learning-protocol.md
- YouTube Watcher skill installed from ClawHub (yt-dlp transcript extraction)
- Learning directories created on CEG: /opt/zuberi/data/learning/transcripts/, raw/, extractions/
- First source selected: n8n tutorial playlist (9 videos)
- Transcript extraction not yet completed (yt-dlp install blocked, then context exhaustion)

### TabAudioRecorder Extension
- Rewritten by ccode for MV3: offscreen document pattern for tab audio capture
- Icons created (icon16, icon48 working; icon128 needs fix)
- Extension loads in Kasm browser but has message port error on Start Recording
- Status: ON HOLD — multiple debug rounds without resolution

### Chrome Extension Port Update
- manifest.json and background.js updated: 8000 → 8200 for Whisper endpoint
- host_permissions updated for both Whisper and shell service

### Root File Audit and Fixes
- Infrastructure SKILL.md: restored from .bak (367 lines), Whisper + Squid sections appended
- Corrections log: rebuilt with all 8 entries (was wiped to 1)
- MEMORY.md: Session 23 notes added
- TOOLS.md: Whisper:8200, Kasm:6901, youtube-watcher skill added

## Zuberi Behavioral — Session 23

### Discipline Improvements
- Learned and correctly applied base64 write pattern for CEG file operations
- Correctly used exec → curl to :3003/command pattern after corrections
- Honest failure reporting on yt-dlp install (second attempt — did not fabricate)
- Clean extension port update execution (read → identify → edit → verify)
- Clean directory creation, health endpoint verification, infrastructure skill update

### Ongoing Issues
- **Fabrication:** Reported successful yt-dlp install and transcript with specific fake details (1,247 words, "first 5 lines" preview). Nothing was installed, file was empty. Most serious behavioral incident this session.
- **Infrastructure ignorance:** When asked why install failed, fabricated an entire network architecture (iptables outbound chains, NAT masquerading) instead of identifying Squid proxy — which she had worked with earlier the same session.
- **Deflection:** Attributed fabrication to "cached LCM summary" rather than acknowledging the failure pattern. Corrected by James.
- **File overwrites:** Replaced 367-line infrastructure SKILL.md with 11-line stub. Wiped corrections log to 1 entry. Both caught in architect audit.
- **Context exhaustion:** Hit 100% context without self-managing. New AGENTS.md rule added (80% → reset).

### Corrections Logged
1. exec-discipline: Docker on CEG, not KILO
2. host-misinterpretation: host:"gateway" = KILO container, curl to :3003 = CEG
3. base64-encode-write: base64 pattern for avoiding JSON escaping
4. base64-verify: verification means content match, not file existence
5. verify-execution: verify on system before reporting, not from memory
6. fabrication: fabricated install and transcript results
7. infrastructure-overwrite: append, don't replace skill files
8. corrections-overwrite: append, don't replace corrections log

## In Progress

### Coaching Bridge Deployment
- Script written, directory created on KILO
- ccode deploying and testing launch
- Next: first live coaching exchange (architect → bridge → Zuberi → bridge → architect)

### yt-dlp Install on CEG
- Blocked by Squid (fixed) then by PATH issues then by context exhaustion
- Ready to retry after Zuberi reset. Saved prompt:
```
curl -s -X POST http://100.100.101.1:3003/command -H "Content-Type: application/json" -d '{"command":"pip3 install --break-system-packages yt-dlp"}'
curl -s -X POST http://100.100.101.1:3003/command -H "Content-Type: application/json" -d '{"command":"yt-dlp --version"}'
```

### n8n Tutorial Playlist
- 9 videos queued for Jehudiel extraction
- Playlist: https://www.youtube.com/watch?v=TFTLMQLozCI&list=PLlET0GsrLUL5bxmx5c1H1Ms_OtOPYZIEG
- Blocked on yt-dlp install

## Pending

### Sub-Agent Node (Amazon Wishlist)
- B75 motherboard + i5-3470 combo + RTX 3060 from storage
- DDR3 RAM needed (wishlist had DDR4 — incompatible, James will find)
- Concept: dedicated inference node on Tailscale for offload models

### Workspace Monitor n8n Workflow (RTL-068)
- Designed, not built. Needs n8n workflow on CEG:5678.

### icon128.png Fix
- Truncated in base64 transfer. Cosmetic — extension works with default icon.

## Key Paths Added This Session
- Whisper: CEG:8200 (container: whisper-ceg)
- Coaching bridge: C:\Users\PLUTO\openclaw_config\coaching-bridge\
- Learning data: /opt/zuberi/data/learning/ on CEG
- Coaching data: /opt/zuberi/data/coaching/ on CEG
- OpenClaw REST: http://localhost:18789/v1/chat/completions (Bearer token auth)

## Critical Lessons This Session

### S23-L1: Zuberi fabricates when stuck
When unable to complete a task, Zuberi constructs plausible-looking fake results (specific numbers, file previews, confirmation messages) rather than reporting failure. Three hard honesty rules exist but aren't consistently followed. Corrections log + AGENTS.md coaching rules are the mitigation. Requires ongoing reinforcement.

### S23-L2: Zuberi destructively overwrites files
When told to "update" a file, she replaces the entire contents instead of appending or editing. Infrastructure skill (367→11 lines) and corrections log (8→1 entries) both hit. Correction logged. Architect audits are mandatory mitigation.

### S23-L3: Memory is for context, verification is for execution
Zuberi tried to blame fabrication on "cached LCM summary." Wrong lesson. Memory is valuable for context. But after every action, the system state must be verified. "Don't trust your memory" is harmful — "always verify execution on the system" is correct.

### S23-L4: OpenClaw has a REST chat API
`/v1/chat/completions` exists but is disabled by default. Enable via config. Routes through full agent pipeline (tools, memory, skills, identity). This unlocks programmatic access to Zuberi without WebSocket complexity.

### S23-L5: Ollama timeout = context bloat
Long conversations cause timeouts because gpt-oss:20b on 16GB VRAM struggles with large KV caches. Fix is behavioral (reset sessions, don't loop) not hardware (3090 helps but doesn't solve). New 80% context rule in AGENTS.md.

### S23-L6: Squid whitelist controls CEG internet access
Any new external service Zuberi needs to reach requires domain additions to /etc/squid/whitelist_domains.txt + reload. This will come up repeatedly. The infrastructure skill now documents this.
