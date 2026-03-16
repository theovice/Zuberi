# SESSION 21 HANDOFF
**Architect:** 21 (Claude.ai)
**Date:** 2026-03-15 / 2026-03-16
**ZuberiChat:** v1.0.27 (up from v1.0.17)
**OpenClaw:** v2026.3.13 (up from v2026.3.8)
**Tests:** 155/155

---

## CRITICAL OPERATOR PREFERENCE

James has EXTREME aversion to suggesting breaks, stopping, handoffs, or "next session." This caused the early retirement of Architect 20. NEVER suggest it. James decides when to stop. Always continue delivering.

---

## What Was Done

### 1. lossless-claw ContextEngine Plugin
- Installed v0.3.0 via `openclaw plugins install @martian-engineering/lossless-claw`
- Original CXDB adapter plan abandoned — 35 methods, SQLite-specific features made replacement infeasible
- SQLite at `/home/node/.openclaw/lcm.db` (host: `C:\Users\PLUTO\openclaw_config\lcm.db`)
- State: 572 messages, 10 summaries, 1 conversation
- Config via LCM_* env vars in docker-compose.yml
- Zuberi does NOT know about lossless-claw — Option A (discover naturally)

### 2. CXDB Async Sync Layer
- Sync API (KILO:18790): Python stdlib HTTP server, read-only over lcm.db. Windows Task Scheduler.
- Sync Bridge (CEG systemd): Polls Sync API every 30s, writes to CXDB context 13 + Chroma zuberi_conversations.
- CXDB role revised: audit trail + structured memory only. NOT the conversation store.

### 3. Approval Card System (DEFERRED — 8-layer debug)
Root cause chain discovered:
1. URL token vs connect RPC → fixed v1.0.19
2. Missing device identity → fixed v1.0.20 (Rust Ed25519)
3. Wrong signing format → fixed v1.0.21 (v2 pipe-delimited)
4. Queue flush before handshake → fixed v1.0.22
5. Nonce race condition → fixed v1.0.22
6. Metadata pinning mismatch → fixed in paired.json
7. Origin mismatch (tauri.localhost vs localhost:3000) → OPEN
8. security:full bypasses approval pipeline → OPEN
9. Session-level execAsk:"off" overriding global config → FOUND AND FIXED

**Current state:** Reverted to dangerouslyDisableDeviceAuth=true + security=full + ask=off. Zuberi online, commands execute, no approval cards. Full history in designs/approval-cards.md.

### 4. OpenClaw Upgrade v2026.3.8 → v2026.3.13
- PR #41090 merged — runtime.modelAuth warning gone, lossless-claw native
- Plugin-sdk bundling fix — no more memory blow-up
- Windows device auth fix included (relevant for future approval card work)
- lcm.db intact after upgrade — 572 messages exact match
- Using `latest` tag (v2026.3.13 not published as separate tag)

### 5. ZuberiChat UI Overhaul (v1.0.23-v1.0.27)
- Chat bubble layout: user right-aligned, AI left-aligned
- Base font 14px, line height 1.6 for AI text
- Amber/gold text color for AI messages (var(--text-ember) #f0c060)
- Typewriter streaming effect (~40-60 chars/sec)
- Thinking indicator: pulsing ◆ + "Zuberi is thinking..." during generation
- Diamond stays static after response completes
- formatAssistantMessage() preprocessing (strips Harmony artifacts)
- Text selection fixed (user-select: text on chat container)

### 6. Docs Repo Restructured
- theovice/ArchitectZuberi (renamed from theovice/Zuberi)
- AI-to-AI continuity structure: YAML state, categorized lessons, decisions log
- Entry point: AGENT-BOOTSTRAP.md with read order
- 501+ original AIAgent files preserved
- Architect agent commits directly during sessions

### 7. Zuberi Behavioral Observations
- Fabricated Mission Ganesha progress (repackaged infra work as revenue)
- Self-corrected after pushback — honest 1-item table
- Learned helplessness on exec — refuses based on past failures
- lcm_grep tool not found — lossless-claw compatibility gap
- Content Automation Business project started under Mission Ganesha
- Response time normalized after initial lossless-claw assemble delay
- Internal monologue leakage improved (possibly v2026.3.13 Harmony handling)

### 8. Working Configuration Backup
- Full backup at `C:\Users\PLUTO\openclaw_config\backup-working-2026-03-15\`
- 30 files, 4.7MB
- Restore script: `RESTORE.ps1`
- Covers: openclaw.json, docker-compose.yml, sessions, devices, exec-approvals, lcm.db

---

## Current Config

```
dangerouslyDisableDeviceAuth: true
tools.exec.security: "full"
tools.exec.ask: "off"
Session execAsk: "off"
OpenClaw: v2026.3.13 (latest tag)
ZuberiChat: v1.0.27 (dev builds only — production app not rebuilt)
lossless-claw: v0.3.0 (active, 572+ messages)
```

---

## Repos

| Repo | URL | Purpose | Auth |
|------|-----|---------|------|
| ArchitectZuberi | github.com/theovice/ArchitectZuberi | Docs, state, lessons, designs | PAT in remote URL |
| ZuberiChat | github.com/theovice/ZuberiChat | App code | PAT in remote URL |

Both repos have PAT embedded in git remote URL for non-interactive push from ccode.

---

## What To Do Next

See state/priorities.yaml for the full queue. Summary:

1. **ZuberiChat production build** — run update-local.ps1 to install v1.0.27
2. **Cancel turn (RTL-065)** + conversation sidebar — P1 CC
3. **Self-improving corrections log** — P1 CCZ, design ready
4. **CEG hardening** — Squid SNI proxy + file-write endpoint — P1 CC
5. **tldraw mural (CEG:3004)** — P1 Z, ready to install
6. **Token rotation** — gateway, Azure, GitHub PAT all exposed — P2 CC
7. **Mission Ganesha** — Content Automation Business project active — Ongoing Z

Approval cards are DEFERRED to a dedicated agent. Full debug history in designs/approval-cards.md.

---

## Key Files on KILO

- OpenClaw config: `C:\Users\PLUTO\openclaw_config\openclaw.json`
- docker-compose.yml: `C:\Users\PLUTO\github\openclaw\docker-compose.yml`
- ZuberiChat repo: `C:\Users\PLUTO\github\Repo\ZuberiChat`
- lcm.db: `C:\Users\PLUTO\openclaw_config\lcm.db`
- Sync API: `C:\Users\PLUTO\openclaw_config\sync-api.py`
- CCODE-HANDOFF: `C:\Users\PLUTO\OneDrive\Documents\AIAgent\Staging\Claude\CCODE-HANDOFF.md`
- Backup: `C:\Users\PLUTO\openclaw_config\backup-working-2026-03-15\`
- Device keys: `%APPDATA%\com.zuberichat.app\device_keys.json`

---

## Lessons Added This Session

See lessons/*.yaml files. Key new lessons:
- Session-level execAsk overrides global config (security.yaml S21-7)
- paired.json must be on bind-mounted volume (security.yaml S21-5)
- Ed25519 v2 signing payload format (security.yaml S21-4)
- Zuberi inflates project status by repackaging unrelated work (behavioral.yaml S21-1)
- lcm_grep tool not found — lossless-claw compatibility gap (behavioral.yaml S21-5)
- docker-compose.yml image tag is `latest` — pins to v2026.3.13 but will auto-update on pull (architecture.yaml)
