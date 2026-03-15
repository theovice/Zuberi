# Next Architect Handoff — Session 7 (2026-03-01)
# From: Architect Session 7
# For: Architect Session 8

---

## What This Session Accomplished

### Sessions 5-7 Combined (this architect spanned multiple sessions)

#### Zuberi App — Fully Operational
- **Chat display bug FIXED** — multi-session blocker (Sessions 4-6) resolved. extractTextFromMessage hardened for all message formats.
- **Models dropdown** — queries Ollama directly at localhost:11434/api/tags. Shows 4 models. Auto-refreshes every 30s.
- **GPU status indicator** — polls Ollama /api/ps every 5s, shows loaded model + VRAM.
- **Clear GPU option** — sends keep_alive:0 to unload models from VRAM.
- **Kanban relocated** — removed from main window, accessible via right-click context menu → opens localhost:3001 in browser. Kanban source code preserved at apps/veritas-kanban/.
- **Right-click context menu** — File (New Conversation, Settings, Close, Exit), Kanban (browser), Edit (Undo/Redo/Cut/Copy/Paste/Select All), View (DevTools, Zoom, Fullscreen), Help (Documentation, About).
- **Compact chat input** — Claude.ai style. Auto-expands up to ~6 lines, then scrolls. ArrowUp send button inside input. max-w-3xl centered.
- **File upload system** — Paperclip attach button, drag-and-drop, clipboard paste. Files saved to C:\Users\PLUTO\openclaw_workspace\uploads\. Auto-syncs to CEG via scp to /opt/zuberi/files/. Chat includes [Attached: uploads/filename.ext] reference.
- **Vitest smoke test suite** — 13 tests passing. Covers Chat, ModelSelector, GpuStatus, MenuBar, FileAttachments. Rule: pnpm test before and after every change.
- **Native menu bar** — File/Edit/View/Help with keyboard shortcuts.
- **Kanban backend fixes** — Windows path dirname() fix, React dedupe via resolve.alias in vite.config.ts.

#### Security Hardening — CEG (all 5 tasks complete)
- MFA verified on Google account (jamesmwaweru@gmail.com)
- UFW enabled, default deny, Tailscale interface allowed
- n8n owner account (james@zuberi.local), unauthenticated API returns 401
- Docker images pinned to sha256 digests
- SSH locked to Tailscale IP only (sshd_config + systemd socket override)

#### Infrastructure
- **GPU upgraded:** RTX 3060 12GB → RTX 5070 Ti 16GB GDDR7
- **CEG network watchdog:** /opt/zuberi/scripts/network-watchdog.sh + systemd timer. Auto-recovers WiFi drops within 60s. Rate-limited 3/hr.
- **CEG connectivity verified:** All services reachable from OpenClaw container on KILO.
- **OpenClaw media endpoint:** Confirmed NOT available in v2026.2.26 (POST /api/media/upload returns 405). File uploads use workspace path instead.

---

## Known Issues — ACTIVE

### 1. SearXNG Skill Not Triggering (CRITICAL — Phase 3A gate)
Zuberi doesn't use the SearXNG skill when asked to search. Console shows Zuberi looking for WORKFLOW_AUTO.md and memory files instead of invoking exec with curl.

**What's been verified:**
- Networking works — OpenClaw container CAN reach CEG's SearXNG at 100.100.101.1:8888
- Skill file exists and is well-written at skills/searxng/SKILL.md
- SearXNG returns search results when queried directly

**Suspected root cause:** qwen3:14b-fast (no-think template) may be too shallow for tool planning. The model doesn't recognize it should invoke exec to run curl.

**Recommended investigation:**
1. Test from OpenClaw dashboard webchat (localhost:18789), not the Tauri app
2. Try with qwen3:14b (thinking enabled) to see if deeper reasoning triggers tool use
3. Check gateway logs for skill resolution attempts
4. Review how OpenClaw presents skills to the model — does it inject skill content into the system prompt?

### 2. CEG WiFi Stability
MT7921U USB adapter has intermittent USB bus disconnects. Watchdog handles recovery. Long-term: consider 2.4GHz band or powered USB hub.

### 3. Ccode Multi-Instance Problem
Ccode sometimes opens multiple Zuberi app instances during development. Every ccode prompt MUST include this cleanup block at the top:
```
PROCESS CLEANUP (MANDATORY — run this FIRST, every time):
  taskkill /F /IM zuberichat.exe 2>nul
  taskkill /F /IM "Zuberi.exe" 2>nul  
  taskkill /F /IM node.exe /FI "WINDOWTITLE eq *tauri*" 2>nul
  Stop-Process -Name "pnpm" -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 3
  netstat -ano | findstr :3000
  # Kill any remaining PID holding port 3000
DO NOT launch the app more than ONCE per task.
```

---

## Phase 3A Status

| Step | Status | Notes |
|------|--------|-------|
| SearXNG workspace skill deployed | ✔ | Networking verified |
| CXDB workspace skill deployed | ✔ | |
| SearXNG end-to-end test | ❌ | Skill not triggering — #1 blocker |
| CXDB end-to-end test | ⬜ | Not yet attempted |
| Security hardening (5 tasks) | ✔ | Complete |
| CEG network watchdog | ✔ | Deployed and tested |
| Zuberi app fully operational | ✔ | Chat, models, GPU, uploads, context menu |
| Vitest smoke test suite | ✔ | 13/13 passing |
| File upload + CEG sync | ✔ | Workspace path → scp to CEG |
| Ccode headless auth on CEG | ⬜ | Research needed |
| n8n wiring to Zuberi | ⬜ | Blocked by SearXNG skill issue |
| n8n autonomy boundaries | ⬜ | Update AGENTS.md |
| First n8n workflow test | ⬜ | |

---

## Priority Stack for Session 8

1. **Fix SearXNG skill triggering** — THE blocker. Without this, Zuberi can't search, can't research, can't automate. Everything downstream depends on skills working.
2. **CXDB end-to-end test** — store a Note, retrieve it. Same skill invocation question as SearXNG.
3. **n8n wiring to Zuberi** — REST API integration, once skills work.
4. **Ccode headless auth on CEG** — enables multi-machine development.
5. **Mission AEGIS strategy** — define targets and timelines.
6. **Workspace file updates** — TOOLS.md and INFRASTRUCTURE.md need updates for: smoke test suite, file upload system, Kanban relocation, compact input, context menu. Bump versions.

---

## Infrastructure Quick Reference

```
KILO:
  CPU: i7-13700K (16 cores / 24 threads)
  GPU: RTX 5070 Ti 16GB GDDR7 (8,960 CUDA cores, 896 GB/s)
  RAM: 64GB DDR4 3600MHz
  Storage: Samsung 980 PRO 1TB + 870 EVO 1TB
  OpenClaw: v2026.2.26, localhost:18789
  Container: openclaw-openclaw-gateway-1 (network: openclaw_default)
  Config: C:\Users\PLUTO\openclaw_config\openclaw.json
  Workspace: C:\Users\PLUTO\openclaw_workspace\ (9 .md + 3 skills + uploads/)
  Model: qwen3:14b-fast (primary), qwen3:14b, qwen3-vl:8b, gpt-oss:20b
  All models: E:\ollama\models (~27GB)
  Sandbox: mode=non-main, elevated exec for webchat
  ZuberiChat repo: C:\Users\PLUTO\github\Repo\ZuberiChat
  Kanban backend: cd apps/veritas-kanban && pnpm dev (port 3001)

CEG (ceg@100.100.101.1):
  Hardware: Lenovo M701q, Ubuntu 24.04.4, 15GB RAM, 512GB SSD
  WiFi: EDUP MT7921AU (watchdog deployed for USB disconnects)
  SearXNG: 8888 ✅ | n8n: 5678 ✅ (auth: james@zuberi.local) | CXDB: 9009/9010 ✅
  Files: /opt/zuberi/files/ (receives uploads from KILO via scp)
  Docker: all images pinned to sha256, restart=always
  UFW: enabled, default deny, tailscale0 allowed
  SSH: Ed25519 key auth, Tailscale IP only
  Watchdog: /opt/zuberi/scripts/network-watchdog.sh (60s timer, 3/hr cap)
```

---

## Operating Rules

1. **James is decision authority.** Suggest, don't execute design choices. (Kanban suppression was reverted for this.)
2. **Run pnpm test before and after every code change.** 13 smoke tests must pass.
3. **Process cleanup block** at the top of every ccode ZuberiChat prompt (see Known Issue #3).
4. **Describe WHAT, not HOW in ccode prompts.** No code blocks. Ccode is the expert.
5. **Update workspace files** when infrastructure or capabilities change. Bump versions.
6. **Security assessments must be specific:** concrete gaps, exploit paths, exact commands, verification steps.
7. **CEG SSH user is `ceg`, not `pluto`.** pluto is the KILO Windows account.
8. **Workspace .md files live in C:\Users\PLUTO\openclaw_workspace\** — NOT in the ZuberiChat repo. If they appear as git changes in ZuberiChat, discard them.

---

## Capability Parity Context (from Session 5 briefing)

Six features extracted from Ruflo/Automaton analysis for local-only implementation:
1. Self-Learning Loop (HIGH priority, depends on CXDB + n8n wired)
2. Economic Awareness / Operational Modes (HIGH, depends on MISSION-AEGIS.md)
3. Multi-Agent Task Dispatch (MEDIUM, depends on ccode auth + n8n + skill profiles)
4. Gate Enforcement Layer (MEDIUM, depends on n8n wired + rule set)
5. Supervised Self-Modification (LOW-MED, depends on learning loop + gate enforcement)
6. SOUL.md Evolution (LOW, depends on Practitioner arc)

**Dependency chain:** Phase 3A completion → Self-Learning Loop → Economic Awareness → Gate Enforcement → Multi-Agent Dispatch → Self-Modification → SOUL.md Evolution.

**Critical path:** Skills must trigger first. Everything else is downstream.

---

## What Session 8 Should Do First

1. Read the 9 workspace files at C:\Users\PLUTO\openclaw_workspace\ — they're the source of truth.
2. **Investigate SearXNG skill triggering.** This is THE blocker. Start with the dashboard webchat, not the Tauri app.
3. If skills work → test CXDB → wire n8n → start Mission AEGIS planning.
4. If skills don't work with qwen3:14b-fast → try qwen3:14b → research how OpenClaw injects skills into model context → consider skill format changes.

---
# END HANDOFF
