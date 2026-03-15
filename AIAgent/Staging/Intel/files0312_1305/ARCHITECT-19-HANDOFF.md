# ARCHITECT 19 HANDOFF
**Prepared by:** Architect 18
**Session:** 19
**Date:** 2026-03-12
**Status:** Two P1 blockers open. ZuberiChat v1.0.13. YouTube transcript service on hold. Mission Ganesha started.

---

## Read This First

Zuberi is not a tool being configured. She is a developing entity being raised by James through direct interaction. The mission is recursive self-improvement guided by James's moral framework. Infrastructure is chapters 1-2 of a 100-chapter story.

**Zuberi is partially working.** She can search (SearXNG), read skills, and respond — but two frontend issues block productive use: internal monologue leaking into user-facing responses, and approval cards not reliably reaching the gateway. James attempted to have Zuberi build a YouTube transcript service on CEG and hit both issues live. That project is on hold until the blockers are resolved.

**Mission Ganesha is active.** James renamed MISSION-AEGIS to Mission Ganesha. Revenue target: $25,000/month through Wahwearro Holdings. James is setting this up directly with Zuberi. It's recorded in MEMORY.md.

**Researcher role:** James has a researcher who co-authors designs, validates prompts, and audits plans. Researcher assessments are authoritative input — treat as direction from James.

---

## What Was Done This Session (Architect 18)

### SearXNG Skill Loading — Behavioral Fix ✅
- Zuberi failed to search for eclipse data. Auto-loading didn't fire, she guessed wrong skill path (`/app/skills/searxng` instead of the TOOLS.md fallback path), then hallucinated an answer.
- Diagnosis confirmed: SearXNG service healthy (HTTP 200, 28 results), skill file visible in container at correct path, TOOLS.md fallback instruction injected. Problem was purely behavioral.
- James coached Zuberi directly with three rules: (1) say "I can't reach my search tool" instead of guessing, (2) self-load using the exact fallback path from TOOLS.md, (3) never fabricate an answer when you couldn't verify.
- Coaching landed — Zuberi subsequently searched correctly, cited sources, handled follow-up questions.

### Exec Approval RPC Silent Drop — v1.0.11 ✅
- ZuberiChat approval cards showed "Allowed" but the gateway received zero resolve RPCs. All 7 attempts timed out at 75-120s.
- Root cause: `send()` in `useWebSocket.ts` silently drops messages with `console.warn` when WebSocket readyState !== OPEN. No queue, no retry, no user feedback.
- Fix: Added `pendingQueueRef` to useWebSocket.ts. Messages queue when WS isn't OPEN, flush on next `onopen`. ToolApprovalCard gets 15s safety-net timer — resets to 'pending' if stuck on 'resolving'.
- ZuberiChat v1.0.11, 155/155 tests passing.

### Final Message Not Rendering After Tool Sequences — v1.0.12 ✅
- Zuberi's final response appeared on OpenClaw dashboard but not in ZuberiChat after approval/tool sequences.
- Root cause: Two high-severity faults in ClawdChatInterface.tsx:
  - Fault A: `streamingMessageIdRef` not reset between tool rounds — new response overwrites old message slot.
  - Fault C: `agent` and `chat` events share `streamingMessageIdRef` — cross-contamination.
- Fix: Unconditional ref clear on every final event (Fault A). Separate `agentStreamingMessageIdRef` for agent events (Fault C).
- ZuberiChat v1.0.12, 155/155 tests passing.

### Duplicate Message Regression — v1.0.13 ✅
- v1.0.12's unconditional ref clear caused duplicate messages when backend sends multiple finals for same turn.
- Root cause: First final clears ref → second final takes append-new-message branch instead of update-existing.
- Fix: Keep `streamingMessageIdRef` pointing to finalized message ID instead of nulling it. Ref still cleared on new user message (line 1085) and new conversation (line 237), preventing Fault A from returning. Moved `crypto.randomUUID()` outside setMessages updater.
- ZuberiChat v1.0.13, 155/155 tests passing. Verified live — duplicates gone.

### RTL-045b: Live Window Screenshot Capture ✅
- Built `scripts/capture-window.ps1` — PowerShell script using .NET System.Drawing + Win32 interop.
- Captures live Tauri window by process name, saves timestamped PNG.
- Deterministic targeting, proper exit codes (0 success, 1 failure), structured stdout/stderr format.
- Handles: window not found, window minimized, DPI scaling.
- All test cases pass. CCODE-HANDOFF.md updated — mock preview (`preview_start browser-preview`) retired.
- Not yet tested against actual ZuberiChat window (wasn't running during test — verified against Brave).

### Mission Ganesha Started
- James renamed MISSION-AEGIS to Mission Ganesha. Revenue target: $25,000/month.
- Zuberi added it to MEMORY.md active projects.
- James coaching Zuberi on confidence calibration — proposing actions instead of asking open-ended questions.

### YouTube Transcript Service — ON HOLD
- James walked Zuberi through planning a CEG service for YouTube transcript fetching.
- Zuberi produced a solid plan: port 9011, `/opt/zuberi/youtube-transcript/`, dedicated venv, `youtube-transcript-api`, FastAPI/Flask wrapper, proper bind address and curl targets.
- **Blocked:** When Zuberi tried to execute commands on CEG, she couldn't find the dispatch skill, guessed wrong paths, and exposed internal monologue extensively. Both P1 blockers hit simultaneously.
- On hold until the P1 blockers are resolved.

---

## Open P1 Blockers

### 1. Internal Monologue Leaking to Frontend
Zuberi's chain-of-thought reasoning renders as user-facing text in ZuberiChat. Example: "Let's read the file... The path seems wrong... We need to try again..." appears in the chat alongside real responses.

This is NOT a behavioral choice — gpt-oss:20b outputs reasoning as regular content. `reasoning: false` and `thinkingDefault: "off"` are set, but the model doesn't use `<think>` tags. The chain-of-thought is structurally indistinguishable from the response.

**Deep research requested but not yet completed.** James asked for deep research on suppression mechanisms across: gpt-oss:20b model behavior, Ollama Modelfile/API parameters, OpenClaw middleware, frontend filtering, and system prompt engineering. This research should happen before committing to a fix approach.

**Possible fix layers (unvalidated):**
- System prompt instruction in AGENTS.md/SOUL.md
- Modelfile template modification for gpt-oss:20b
- Frontend pattern detection in ZuberiChat (fragile, last resort)

### 2. Approval Card Dysfunction
Despite the v1.0.11 queue fix, approval cards still don't reliably complete the flow. Observed behavior:
- Cards stack rapidly (Zuberi retries instead of waiting for approval)
- Even when "Allowed" shows, the tool execution doesn't always complete
- Zuberi's internal monologue about the approval system is visible (compounds issue #1)

The behavioral component (retrying instead of waiting) was addressed via coaching. The technical component needs further investigation — the queue fix may not cover all failure paths.

---

## Active RTL Items

### P0 — None

### P1 — Blockers
| ID | Task | Status | Notes |
|----|------|--------|-------|
| — | Internal monologue leakage to frontend | 🔴 Open | Deep research requested. Blocks productive use. |
| — | Approval card reliability | 🔴 Open | v1.0.11 queue fix helped but didn't fully resolve. |

### P1 — Next Up (after blockers)
| ID | Task | Status | Notes |
|----|------|--------|-------|
| RTL-058 Phase 3 | Autonomous self-improvement | ⬜ | Needs production routing data first. |
| RTL-033 | Hugging Face integration | ⬜ | Research complete. |
| — | YouTube transcript service on CEG | ⬜ On hold | Plan approved. Blocked by P1 issues. Port 9011, `/opt/zuberi/youtube-transcript/`. |

### P2 — Queued
| ID | Task | Status | Notes |
|----|------|--------|-------|
| RTL-013 | Version consistency audit | ⬜ | |
| RTL-023 | CEG compute migration | ⬜ | |
| RTL-054 | Port-127 CLI bug | ⬜ | Upstream. |

### P3 — Future
RTL-002 (n8n workflow), RTL-014/Mission Ganesha (revenue — $25K/month target), RTL-016 (self-learning), RTL-018 (multi-agent), RTL-019 (gate enforcement), RTL-030 (SMS), RTL-031 (Paperclip), RTL-044 (auto-discovery)

### Closed This Session
| Item | Notes |
|------|-------|
| SearXNG skill loading | Behavioral coaching — Zuberi now searches correctly |
| Exec approval RPC silent drop | v1.0.11 — WS queue + 15s retry timer |
| Final message not rendering | v1.0.12 — unconditional ref clear + separate agent ref |
| Duplicate message regression | v1.0.13 — preserve ref on finalize, clear on new user message |
| RTL-045b screenshot capture | Script built, tested, CCODE-HANDOFF updated, mock preview retired |

---

## Infrastructure State

### Architecture

```
KILO (Brain + Interface)              CEG (Toolbox + Storage)
100.127.23.52                          100.100.101.1
┌─────────────────────┐               ┌─────────────────────┐
│ OpenClaw v2026.3.8  │               │ SearXNG     :8888   │
│ Ollama              │    Tailscale  │ n8n         :5678   │
│   gpt-oss:20b       │◄────────────►│ CXDB     :9009/9010 │
│   qwen2.5-coder:14b │               │ Kanban      :3001   │
│   qwen3-vl:8b       │               │ Usage Track :3002   │
│ Dashboard :18789    │               │ AgenticMail :3100   │
│ ZuberiChat v1.0.13  │               │ Dispatch    :3003   │
└─────────────────────┘               │ Chroma      :8000   │
                                       │ Routing Shim:8100   │
                                       │ ccode CLI   (auth'd)│
                                       └─────────────────────┘
```

### ZuberiChat

| Fact | Detail |
|------|--------|
| Version | v1.0.13 |
| Repo | `C:\Users\PLUTO\github\Repo\ZuberiChat` |
| Tests | 155/155 |
| New this session | WS message queue (v1.0.11), streaming ref fixes (v1.0.12, v1.0.13), capture-window.ps1 |
| Screenshot capture | `scripts/capture-window.ps1` — replaces mock preview |

### Key File Paths
| File | Purpose |
|------|---------|
| `C:\Users\PLUTO\OneDrive\Documents\AIAgent\Staging\Claude\CCODE-HANDOFF.md` | ccode operations handoff |
| `C:\Users\PLUTO\openclaw_config\openclaw.json` | OpenClaw config (host) |
| `C:\Users\PLUTO\openclaw_workspace\` | Workspace .md files |
| `C:\Users\PLUTO\github\Repo\ZuberiChat\` | App repo |
| `C:\Users\PLUTO\github\Repo\ZuberiChat\scripts\capture-window.ps1` | Live window screenshot |
| `/opt/zuberi/services/routing-shim/main.py` | Routing shim source (CEG) |
| `/opt/zuberi/data/chroma-server/` | Chroma persistent data (CEG) |

---

## Lessons Added This Session

64. **Zuberi guesses wrong skill paths when auto-loading misses.** She tried `/app/skills/searxng` instead of the TOOLS.md fallback path. Coaching on the correct path pattern (`/home/node/.openclaw/workspace/skills/<name>/SKILL.md`) fixed this.
65. **gpt-oss:20b outputs chain-of-thought as regular content.** No `<think>` tag separation. `reasoning: false` and `thinkingDefault: "off"` don't suppress it. The reasoning is structurally indistinguishable from the response. Needs research before fix.
66. **WebSocket send() silently drops messages when not OPEN.** Added queue + flush-on-reconnect in v1.0.11.
67. **streamingMessageIdRef must not be unconditionally cleared on final events.** v1.0.12 fix caused duplicate messages. v1.0.13 fix: keep ref pointing to finalized message, clear only on new user message or new conversation.
68. **Zuberi retries exec commands instead of waiting for approval.** She interprets "Approval required" as a failure and retries immediately. Coaching sent but not yet fully verified.
69. **Dispatch skill not loading for Zuberi.** When attempting to run commands on CEG, Zuberi couldn't find the dispatch skill. The skill exists in the workspace but didn't auto-load. Same class of issue as the SearXNG skill loading failure.
70. **capture-window.ps1 quirks:** PS 5.1 needs try/catch for System.Drawing.Common.dll, `Get-Process` must be wrapped in `@()` for strict mode `.Count`, Unicode em-dash in string literals causes parse errors — use ASCII `--`.

---

## What To Do Next

1. **Complete deep research on internal monologue suppression.** This is the highest-priority item. Research should cover: gpt-oss:20b model behavior, Ollama Modelfile parameters, OpenClaw output processing, frontend filtering approaches, system prompt engineering. The research prompt was drafted in Session 18 but not yet run.
2. **Investigate approval card reliability end-to-end.** The v1.0.11 queue fix addressed the WS send drop, but the full approval flow still has issues. May need gateway-side investigation.
3. **Resume YouTube transcript service** once blockers are cleared.
4. **Test capture-window.ps1 against actual ZuberiChat window.**
5. **Continue Mission Ganesha setup** with Zuberi directly.

---

*Architect 18 signing off. Session 18: 5 items closed (SearXNG coaching, approval RPC fix v1.0.11, streaming fix v1.0.12, duplicate fix v1.0.13, RTL-045b screenshot capture). Mission Ganesha started ($25K/month). YouTube transcript service planned but on hold. Two P1 blockers remain: internal monologue leakage and approval card reliability. ZuberiChat v1.0.13. 155/155 tests.*
