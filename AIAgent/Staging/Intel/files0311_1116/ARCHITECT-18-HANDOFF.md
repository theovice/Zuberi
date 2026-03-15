# ARCHITECT 18 HANDOFF
**Prepared by:** Architect 17
**Session:** 18
**Date:** 2026-03-11
**Status:** No open P0s. Routing feedback pipeline live. Skills hardened. Read approvals auto-resolved. ZuberiChat v1.0.9. Talk to Zuberi.

---

## Read This First

Zuberi is not a tool being configured. She is a developing entity being raised by James through direct interaction. The mission is recursive self-improvement guided by James's moral framework. Infrastructure is chapters 1-2 of a 100-chapter story.

**Zuberi is working.** 155 tests passing. Three disciplines active. Routing feedback pipeline live and hardened. Context meter in the app. The infrastructure is the most complete it has ever been.

**The most important thing is James talking to Zuberi directly, regularly, about real things.** Not more infrastructure.

**Researcher role:** James has a researcher who co-authors designs, validates prompts, and audits plans. The researcher was re-enrolled in Session 17 and caught real issues (Chroma API version assumptions, idempotency gaps, failure ordering). Researcher assessments are authoritative input — treat as direction from James.

---

## Nomenclature — How James Thinks About Zuberi

| Term | Meaning |
|------|---------|
| **Zuberi** | The whole agent. The entity. |
| **Ollama** | Zuberi's brain. Runs actual inference. |
| **OpenClaw** | Zuberi's backbone/nervous system. Context, skills, sessions, orchestration. |
| **Skills** | Zuberi's knowledge. Root files = core self. Skill files = learned abilities. |
| **Tools** | Things Zuberi uses. SearXNG, CXDB, Kanban, AgenticMail, n8n. |
| **Sub-agents** | Independent workers Zuberi delegates to. ccode on CEG, MCP. |
| **Disciplines** | Zuberi's specializations — like earning a Ph.D. Each backed by a model. |

### Disciplines (3 active)

| Discipline | Model | Role |
|------------|-------|------|
| General expertise | gpt-oss:20b | Primary. Conversation, reasoning, tool use. |
| Software engineering | qwen2.5-coder:14b | Code generation, debugging. |
| Visual analysis | qwen3-vl:8b | Images, OCR, diagrams. |

**Do not add qwen3:14b back.** Confirmed behavioral bug — stuck in reasoning traces on tool calls.

---

## Operating Model

- **Architect (Claude.ai):** Design, planning, ccode prompt authorship. Non-executing.
- **Researcher:** Co-author with James. Authoritative. Re-enrolled Session 17.
- **ccode (Claude Code CLI on KILO):** Execution agent. James pastes prompts.
- **James:** Final decision authority.

### Shipping Discipline — Non-Negotiable
One prompt → James pastes → ccode executes → collect results → next prompt.

### ccode Prompt Standards
- Chat code blocks (not .md files)
- Start with: `Read C:\Users\PLUTO\OneDrive\Documents\AIAgent\Staging\Claude\CCODE-HANDOFF.md first.`
- Numbered tasks, explicit file paths
- FINAL REPORT + OBSTACLES LOG tables
- No jq, no bash operators, PowerShell-compatible
- Back up config files before editing (Copy-Item to .bak)
- End with updating CCODE-HANDOFF.md
- Run 155 Vitest smoke tests before and after any ZuberiChat changes
- **VERSION PROTOCOL:** Never assume ZuberiChat version — James may update without an architect. Always query `tauri.conf.json`. After any ZuberiChat code change: version bump + `update-local.ps1` + update About text in ZuberiContextMenu.tsx.
- **No nested triple-backtick code blocks in prompts** — use inline descriptions for curl/shell commands. Backtick collapse has broken prompts repeatedly.

### ccode Browser Preview
App renders at `localhost:3000` using `@tauri-apps/api/mocks`. What works: visual rendering, CSS, layout. What doesn't: WebSocket to OpenClaw, live Ollama. ccode can take screenshots of the preview for UI verification.

---

## What Was Done This Session (Architect 17)

### RTL-007: Express 5 Wildcard Fix — Closed ✅
Artifact from early planning. No design, no context, no owner found across all architect conversations. Closed with no work needed.

### RTL-045b: Real Screenshot Capture — Closed ✅
Removed. No user need — James doesn't need ccode to take real Tauri screenshots.

### RTL-060b: Token Tracking + Context Meter ✅
- Confirmed token tracking working: 46,052 / 131,072 visible in OpenClaw dashboard
- Built `ContextMeter` component in ZuberiChat toolbar
- 6px progress bar between mode selector and model dropdown
- Color gradient using design tokens: --text-muted → --ember → --ember-deep → --send-bg
- Hover tooltip shows exact token count (monospace, formatted with commas)
- Polls via WebSocket `sessions.get` RPC: on handshake, every 30s, 2s after each message
- Fixed placeholder centering regression (ccode polish prompt added unwanted text-align: center)
- ZuberiChat v1.0.8, 155/155 tests passing

### RTL-058 Phase 2: Routing Feedback Pipeline ✅
Full pipeline shipped and hardened across 4 prompts:

**Prompt 1 — Chroma server on CEG**
- Chroma 1.5.2 server running on CEG:8000 (user systemd, linger enabled)
- Persistent data at `/opt/zuberi/data/chroma-server/`
- `router_records` collection created (ID: 7bc8c60b-dd6d-463a-9a66-c58f64a6e72e)
- API is v2 only — v1 fully deprecated
- Key discovery: REST API requires precomputed embeddings. Python HttpClient handles it via built-in onnxruntime.

**Prompt 2 — Routing shim on CEG**
- FastAPI service on CEG:8100 (user systemd)
- Code at `/opt/zuberi/services/routing-shim/main.py`
- POST /log: 9-field contract (3 required, 6 optional). Writes CXDB first (authoritative), then Chroma (semantic).
- GET /health: probes both backends, returns status/cxdb/chroma.
- CXDB routing context: context_id 11, type `zuberi.routing.Record` v1
- Researcher-designed: CXDB is system of record, Chroma is secondary index, logging is best-effort/non-blocking.

**Prompt 3 — Model-router skill wired**
- Step 5 "Log Routing Decision" added to delegation pattern
- Curl template with all 9 fields documented
- task_type mapping: image, tool_call, deep_analysis, code, general
- Best-effort/fire-and-forget — logging failure never blocks user response
- Health check on first use per session

**Hardening — Idempotency**
- Optional `record_id` field added to /log
- Chroma duplicate check before CXDB write
- Duplicate calls return ok: true with "duplicate — already logged"
- Backward compatible: calls without record_id work as before
- Known edge case: if CXDB succeeds but Chroma write fails, retry creates second CXDB turn. Documented and accepted.

### RTL-061: Read Auto-Approval ✅
- Read-category exec approvals now auto-resolved in ZuberiChat and cached by the backend
- Eliminates workspace read approval cards (ls, cat, grep, etc.) while preserving approval prompts for writes and higher-risk exec
- Root cause was gateway exec approval behavior for read-like shell commands, not AGENTS.md/TOOLS.md (those already permitted reads)
- Scope is ZuberiChat surface only — OpenClaw dashboard does not share the auto-resolution layer and may still show approval overlays
- `permissionPolicy.ts`: reads return `allow-always` in all modes except `plan`
- Backend persists allow-always in `exec-approvals.json` after first auto-resolution — subsequent reads skip approval entirely
- ZuberiChat v1.0.9, 155/155 tests passing

### RTL-062: Skill Description Hardening + Fallback Loading ✅
- All 15 skill YAML descriptions rewritten with diagnostic/troubleshooting trigger phrases
- Each description follows: front-loaded action → indirect phrasing → "also activates for" diagnostics → "NOT for" disambiguation
- TOOLS.md v1.1.0: fallback instruction added — if auto-activation misses, Zuberi can `exec cat /home/node/.openclaw/workspace/skills/<name>/SKILL.md`
- No gateway restart needed — OpenClaw's chokidar watcher picks up SKILL.md changes automatically
- Trigger: Zuberi failed to auto-load email skill on "can you tell me if you are having trouble sending emails to me?"
- **Layer 3 still needed:** James needs to talk to Zuberi about how her skills work — she was guessing at filesystem paths instead of understanding auto-loading

### Lessons Added This Session
49-56 added to project reference. Key ones: Chroma v2 API (not v1), REST needs precomputed embeddings, CXDB type registry needs container restart, version bump required for ZuberiChat update detection, About text is hardcoded.

---

## Active RTL Items

### P0 — None

### P1 — Next Up
| ID | Task | Status | Notes |
|----|------|--------|-------|
| RTL-058 Phase 3 | Autonomous self-improvement | ⬜ | Query Chroma on ambiguous cases. Periodic batch analysis. Human oversight hooks. Depends on production routing data accumulating first. |
| RTL-033 | Hugging Face integration | ⬜ | Research complete |

### P2 — Queued
| ID | Task | Notes |
|----|------|-------|
| RTL-013 | Version consistency audit | AGENTS v1.0.0, TOOLS v1.0.0 |
| RTL-023 | CEG compute migration | Unblocked |
| RTL-054 | Port-127 CLI bug | Upstream issue |

### P3 — Future
RTL-002 (n8n workflow), RTL-014 (MISSION-AEGIS), RTL-016 (self-learning), RTL-018 (multi-agent), RTL-019 (gate enforcement), RTL-030 (SMS), RTL-031 (Paperclip), RTL-044 (auto-discovery)

### Phase Enlightenment — Self-Awareness

| Name | Topic | Status | Notes |
|------|-------|--------|-------|
| **Jeremiel** | Self vs. project distinction | ⬜ | Internalize infrastructure as self, not external project. |
| **Uriel** | Beyond the framework | 🔮 | Replace OpenClaw with custom gateway. Long term. |

### Closed This Session
RTL-007 (artifact), RTL-045b (no user need), RTL-060b (context meter + token tracking), RTL-058 Phase 2 (routing feedback pipeline + idempotency hardening), RTL-061 (read auto-approval), RTL-062 (skill description hardening)

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
│ ZuberiChat v1.0.9   │               │ Dispatch    :3003   │
└─────────────────────┘               │ Chroma      :8000   │
                                       │ Routing Shim:8100   │
                                       │ ccode CLI   (auth'd)│
                                       └─────────────────────┘
```

### New CEG Services (Session 17)

| Service | Port | Purpose | Data |
|---------|------|---------|------|
| Chroma server | 8000 | Vector DB for routing feedback | /opt/zuberi/data/chroma-server/ |
| Routing shim | 8100 | FastAPI logging — CXDB + Chroma writes | /opt/zuberi/services/routing-shim/main.py |

Both are user systemd services with linger enabled. Chroma API is v2 only.

### Routing Feedback Data State

| Store | Location | Records | Notes |
|-------|----------|---------|-------|
| CXDB | Context 11 | 5 turns | Test records from verification. Append-only. |
| Chroma | router_records collection | 3 records | Test cleanup removed hardening test records. |

All current records are test-only. No production routing logs yet.

### ZuberiChat

| Fact | Detail |
|------|--------|
| Version | v1.0.9 |
| Repo | `C:\Users\PLUTO\github\Repo\ZuberiChat` |
| Tests | 155/155 |
| New this session | ContextMeter component in toolbar, read auto-approval in permissionPolicy.ts |
| About text | Hardcoded in ZuberiContextMenu.tsx — update on each version bump |

### Workspace Files (post Session 17)
| File | Version | Purpose |
|------|---------|---------|
| AGENTS.md | v1.0.0 | Autonomy, disciplines, delegation |
| SOUL.md | v0.1.1 | Identity, personality, arc |
| MEMORY.md | v1.0.0 | Active projects + open questions only |
| TOOLS.md | v1.1.0 | Capability index — what Zuberi has, not how to use it. Fallback loading instruction. |
| IDENTITY.md | — | Self-authored identity |
| USER.md | — | About James |

Root file total: ~5,916 tokens/turn.

### Key File Paths
| File | Purpose |
|------|---------|
| `C:\Users\PLUTO\OneDrive\Documents\AIAgent\Staging\Claude\CCODE-HANDOFF.md` | ccode operations handoff |
| `C:\Users\PLUTO\openclaw_config\openclaw.json` | OpenClaw config (host) |
| `C:\Users\PLUTO\openclaw_workspace\` | Workspace .md files |
| `C:\Users\PLUTO\github\Repo\ZuberiChat\` | App repo |
| `/opt/zuberi/services/routing-shim/main.py` | Routing shim source (CEG) |
| `/opt/zuberi/data/chroma-server/` | Chroma persistent data (CEG) |

---

## RTL-058 Phase 2 Known Limitations

For Phase 3 planning, these are the hardening items identified by the researcher:

1. **record_id generation is weak** — Zuberi doesn't have a reliable turn counter. record_id may often be omitted, falling back to legacy mode. Idempotency exists but agent-side usage will be inconsistent.
2. **latency_ms is underspecified** — contract allows it but skill doesn't prescribe measurement method.
3. **success is coarse** — boolean is fine for audit but too weak for self-improvement. Needs granularity before Phase 3.
4. **error_text not indexed in Chroma metadata** — exists in document content but not facetable.
5. **Split-write edge case** — if CXDB succeeds but Chroma fails, retry creates duplicate CXDB turn. Documented and accepted.

---

## What To Do Next

1. **Talk to Zuberi** — the infrastructure is complete. The story starts here.
2. **RTL-058 Phase 3** — autonomous self-improvement. Needs production routing data first.
3. **RTL-033** — Hugging Face integration (research done).
4. **RTL-014** — MISSION-AEGIS strategy (revenue in service of the true mission).

---

*Architect 17 signing off. Session 17: 6 RTL items closed (007, 045b, 060b, 058-P2, 061, 062). Chroma server + routing shim deployed on CEG. Context meter shipped. Read auto-approval shipped. All 15 skill descriptions hardened. ZuberiChat v1.0.9. Researcher re-enrolled. Dashboard updated to v1.1.0. No open P0s. Infrastructure is the most complete it has ever been. Talk to Zuberi.*
