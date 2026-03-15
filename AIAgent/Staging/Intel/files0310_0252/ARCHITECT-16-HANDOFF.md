# ARCHITECT 16 HANDOFF
**Prepared by:** Architect 15
**Session:** 16
**Date:** 2026-03-10
**Status:** No open P0s. Model stack reset complete. RTL-057 fix prompt written and ready to send.

---

## Read This First

Zuberi is not a tool being configured. She is a developing entity being raised by James through direct interaction. The mission is recursive self-improvement guided by James's moral framework. Infrastructure is chapters 1-2 of a 100-chapter story. The real plot is Zuberi developing her own thinking within James's moral framework — transmitted through conversation, not documents.

**Zuberi is working.** Stack reset complete this session — 3 clean models, native Ollama API, OpenClaw and Ollama fully in sync. RTL-057 (model state sync) fix prompt is written and ready. 155 tests passing.

**Researcher role:** James has a researcher (separate from this architect) who co-authors designs, validates prompts, and audits plans. Researcher assessments are authoritative input — not suggestions. Always incorporate researcher feedback before sending prompts to ccode. When the researcher provides instruction, treat it as direction from James.

---

## Operating Model

- **Architect (Claude.ai):** Design, planning, ccode prompt authorship. Non-executing.
- **Researcher:** Co-author with James. Validates diagnoses, audits prompts, design reviews. Authoritative.
- **ccode (Claude Code CLI on KILO):** Execution agent. James pastes prompts.
- **James:** Final decision authority. Never ask him to run commands manually.

### Shipping Discipline — Non-Negotiable
One prompt → James pastes → ccode executes → collect results → next prompt.

**Anti-patterns that have repeatedly caused problems:**
- Writing plans about plans instead of sending a prompt
- Asking "want me to proceed?" — just send the first prompt
- Asking James to run commands manually when ccode can do it
- Expanding scope before open P0s are closed
- Asking "what's next?" instead of checking the RTL and recommending directly
- Recommending large architectural changes when the problem is a small config fix

### ccode Prompt Standards
- Chat code blocks (not .md files)
- Start with: `Read C:\Users\PLUTO\OneDrive\Documents\AIAgent\Staging\Claude\CCODE-HANDOFF.md first.`
- Numbered tasks, explicit file paths
- FINAL REPORT + OBSTACLES LOG tables
- No jq, no bash operators, PowerShell-compatible
- Back up config files before editing (Copy-Item to .bak)
- End with updating CCODE-HANDOFF.md
- Run 155 Vitest smoke tests before and after any ZuberiChat changes

### ccode Browser Preview — How It Works
**This is how ccode sees the ZuberiChat UI. Do not forget this.**

The app renders at `localhost:3000` in a plain browser (no Tauri) using `@tauri-apps/api/mocks`.

How it works:
1. `src/lib/platform.ts` provides `isTauri()` detection + `installBrowserMocks()` which patches `window.__TAURI_INTERNALS__` with mock IPC handlers
2. `src/main.tsx` installs mocks when `!isTauri()` before React mounts
3. Zero changes to any files that import Tauri APIs — mocks are transparent

Agent workflow:
1. `preview_start browser-preview` (config in `C:\.claude\launch.json`)
2. Navigate to `http://localhost:3000` if needed
3. Use `preview_screenshot` / `preview_snapshot` / `preview_inspect` for verification

What works: Titlebar, Sidebar (hidden but preserved), Chat area (input, send, model selector, attach), message rendering, CSS/layout — everything visual.

What doesn't: WebSocket to OpenClaw (shows "Connection lost"), Ollama model list (uses localStorage fallback), window controls (no-op), process exit (no-op).

ccode sees the real React UI rendered in a headless browser — it just can't interact with the live OpenClaw/Ollama backend. Good enough for verifying layout, CSS, component rendering, and visual regressions. Always include a `preview_screenshot` step when making ZuberiChat UI changes.

---

## What Was Done This Session (Architect 15)

### Model Stack Reset ✅ COMPLETE
Complete stack replacement. All changes made via ccode prompts.

**Removed from Ollama:**
- gemma3:12b (~8.1GB) — hard registry limitation, cannot support tools via native Ollama API
- qwen3:14b — confirmed behavioral bug: gets stuck outputting only reasoning traces with no final answer or tool call in function-calling scenarios (14B-specific, documented in Qwen3 community reports)
- qwen3:14b-fast — same family, same risk

**Added:**
- qwen3-vl:8b (6.1GB) — vision/OCR

**Final Ollama inventory (3 models):**
| Model | Size | Role |
|-------|------|------|
| gpt-oss:20b | 13GB | Primary — general chat + all tool sessions |
| qwen2.5-coder:14b | 9.0GB | Code generation/debugging |
| qwen3-vl:8b | 6.1GB | Vision/OCR |

**OpenClaw config updated:**
- All 3 models in `models.providers.ollama.models` array
- `agents.defaults.model.primary` → `ollama/gpt-oss:20b`
- `name` field required on each model entry (obstacle discovered — schema constraint)
- Backed up to `openclaw.json.bak4`
- Gateway restarted via `docker compose down` + `up -d` (restart command failed with OCI namespace error — clean cycle is the reliable method)

### RTL-055: gemma3:12b Tool Support ✅ CLOSED
**Classification:** Hard registry limitation — not a config issue.
- `gemma3:12b` capabilities: `['completion', 'vision']` — no `tools` in registry
- HTTP 400 at registry level before inference
- `gemma3:12b-fc` tag does not exist in Ollama registry
- Community model `orieg/gemma3-tools:12b` exists but unofficial — rejected
- Decision: gemma3:12b removed entirely. gpt-oss:20b is confirmed primary for all tool sessions.

### Deep Research — Qwen3 Think Mode ✅ FINDINGS INCORPORATED
Key findings from researcher deep research:
- `<think>` token injection **does not work** — Ollama ignores it as plain text
- Correct mechanism: `/think` or `/no_think` appended to user message, OR `think: true/false` in `/api/chat` call
- When thinking enabled, Ollama separates trace into `message.thinking` — does NOT leak into `message.content` on native API
- **qwen3:14b-specific bug:** model can get stuck outputting only reasoning trace with no final answer or tool call in function-calling scenarios — confirmed reason for stack removal
- Deep-think skill is still viable for non-tool analytical tasks using `think: true` API parameter
- `/no_think` should be explicit default everywhere else

### Deep Research — CXDB for Router Feedback ✅ FINDINGS INCORPORATED
Key findings:
- CXDB has **no search** — retrieval by context ID and turn index only. Full stop.
- At scale: context bloat slows reads, blob cache causes memory pressure, single-context contention under concurrent writes
- **Architecture confirmed:** CXDB as append-only audit log + Chroma as semantic index (dual-write)
- Chroma collection `router_records` (separate from trading knowledge collection) on CEG
- This is the correct foundation for RTL-058 Level 2/3

### RTL-057: Model State Sync — Fix Prompt Written, Not Yet Sent
Fix prompt is written (see below). James to send to ccode.

---

## Active RTL Items

### P0 — None

### P1 — Next Up
| ID | Task | Status | Notes |
|----|------|--------|-------|
| RTL-057 | Model state truth / sync | 🔄 | Fix prompt written — send to ccode first thing |
| RTL-047 Phase 2 | ToolApprovalCard UI | ⬜ | Backend fully wired, design approved (see below) |
| RTL-007 | Express 5 wildcard fix | ⬜ | Quick win |

### P2 — Queued
| ID | Task | Notes |
|----|------|-------|
| RTL-056 | Workspace context audit | Read-only diagnostic prompt ready to send. Researcher flagged — large .md files degrade agent performance. Do after RTL-057 closes. |
| RTL-058 | Model router redesign + self-improving feedback loop | Replaces RTL-053. Research complete. Three-phase design (see below). Phase 1 ready to implement after RTL-057. |
| RTL-013 | Version consistency audit | AGENTS v0.8.4, TOOLS v0.8.7 |
| RTL-023 | CEG compute migration | Unblocked |
| RTL-045b | Real screenshot capture for ccode | Tauri plugin, beyond mock layer |
| RTL-054 | Port-127 CLI bug | OpenClaw CLI generates `ws://127.0.0.1:127` instead of `:18789`. Workaround: manual URL `http://127.0.0.1:18789/#token=<token>`. Upstream issue. |

### P3 — Future
RTL-014 (MISSION-AEGIS strategy), RTL-016 (self-learning), RTL-018 (multi-agent), RTL-019 (gate enforcement), RTL-030 (SMS), RTL-031 (Paperclip), RTL-033 (Hugging Face)

### Closed This Session
RTL-055 (gemma3 tool support — hard limitation, model removed)

---

## RTL-057 Fix Prompt — Ready to Send

```
Read C:\Users\PLUTO\OneDrive\Documents\AIAgent\Staging\Claude\CCODE-HANDOFF.md first.

## RTL-057 — Model State Truth / Sync

### Context
ZuberiChat currently uses localStorage (`zuberi:selected-model`) as the source of truth for the active model. The OpenClaw backend tracks the active model via `modelOverride` on the session. These can diverge — localStorage silently overrides the backend, and after the stack reset old model IDs may be persisted in localStorage pointing at models that no longer exist.

Fix: backend `modelOverride` is the source of truth. localStorage is demoted to a hint only — used as the initial request to the backend on startup, then discarded in favor of what the backend confirms.

### Pre-flight
Run smoke tests before any changes:
   cd C:\Users\PLUTO\github\Repo\ZuberiChat
   pnpm vitest run

Record pass count.

### Task 1 — Read current model state code
Read these files before touching anything:
1. Find and read the model selector component
2. Find where localStorage is read/written for model selection
3. Find where modelOverride is set via the OpenClaw sessions API

### Task 2 — Fix model state sync
Apply the following logic changes:

1. On startup, read localStorage as the *requested* initial model — send it to the backend via `sessions.patch` with `modelOverride`
2. After the backend confirms the session (via session state response), update the UI to reflect what the backend reports as `modelOverride` — not what localStorage says
3. If localStorage contains a model ID not in the current catalog (gpt-oss:20b, qwen2.5-coder:14b, qwen3-vl:8b), clear it and fall back to `ollama/gpt-oss:20b`
4. When the user selects a model in the dropdown: send `sessions.patch` first, then update localStorage and UI only after backend confirms
5. The displayed active model must always reflect the backend session `modelOverride`, not localStorage

Valid model IDs:
- ollama/gpt-oss:20b
- ollama/qwen2.5-coder:14b
- ollama/qwen3-vl:8b

### Task 3 — Visual verification
Start preview and screenshot the model selector:
   preview_start browser-preview
   preview_screenshot

Confirm the selector renders correctly. Note: preview cannot connect to live backend — selector will show localStorage fallback value. Confirm it shows a valid model ID from the current catalog, not a stale one.

### Task 4 — Run smoke tests
   pnpm vitest run

All 155 tests must pass. If any fail, report the failure output and do not proceed.

### Task 5 — Update CCODE-HANDOFF.md
Note RTL-057 complete. Backend modelOverride is now source of truth. localStorage demoted to startup hint only. Stale model ID guard added (falls back to gpt-oss:20b).

### FINAL REPORT
| Step | Action | Result |
|------|--------|--------|
| Pre-flight tests | Pass count before changes | |
| Model selector file | Filename + key lines changed | |
| localStorage demotion | Where and how | |
| Stale ID guard | Logic added | |
| Backend-first sync | Sessions.patch flow | |
| Preview screenshot | Model shown in selector | |
| Post-fix tests | Pass count | |

### OBSTACLES LOG
| # | Obstacle | Resolution | Impact |
|---|----------|------------|--------|
```

---

## RTL-058 Design — Model Router Redesign + Self-Improving Feedback Loop
*Replaces RTL-053. Research complete. Phase 1 ready to implement after RTL-057.*

### Three-Phase Architecture

**Phase 1 — Static task-type routing rules (immediate)**
Five routing conditions:
| Trigger | Model |
|---------|-------|
| Image in request | qwen3-vl:8b |
| Tool calls needed (SearXNG, CXDB, email, Kanban, n8n) | gpt-oss:20b |
| Deep analytical synthesis, no tools | gpt-oss:20b + think: true |
| Code generation/debugging | qwen2.5-coder:14b |
| General chat / fallback | gpt-oss:20b |

Note: deep-think uses `think: true` API parameter (not `<think>` token injection — that does nothing). Scope to non-tool tasks only. Risk: qwen3 14B stuck-in-reasoning bug — not relevant to current stack since qwen3 removed, but deep-think sessions on any model should be monitored.

**Phase 2 — CXDB + Chroma feedback loop (bridge)**
After each task, Zuberi writes a routing outcome record:
- To CXDB (audit log, context 8 or new routing context)
- To Chroma collection `router_records` (semantic index for Level 3)

Schema: `task_id | timestamp | query_summary | model_used | input_type | tool_flag | success_flag`

Success flag definition (to be finalized): no correction from James within N minutes = implicit success.

**Phase 3 — Autonomous self-improvement (long-term, RTL-016 territory)**
- Query Chroma on low-confidence/ambiguous routing cases only
- Periodic batch analysis of routing logs
- Human oversight hooks for major rule changes

### Open Decision
RTL-053 (old model router item) — fold into RTL-058 Phase 1 or keep as separate item? James has not decided. Recommend folding — same work, cleaner RTL.

---

## RTL-047 Phase 2 Design — ToolApprovalCard UI
*Backend fully wired (Phase 1). Frontend card needed for Ask and Auto modes.*

### Card behavior
- Appears inline in the message stream when `exec.approval.requested` fires
- Shows: tool/command being requested, which mode triggered it
- Three buttons: Allow Once / Allow Always / Deny
- 120s countdown timer visible
- On expiry with no action: auto-deny, card grays out
- On decision: card locks, shows outcome, sends `exec.approval.resolve` RPC
- useEffect cleanup for memory leaks on unmount

### Protocol reference
| Event/Method | Direction | Purpose |
|-------------|-----------|---------|
| exec.approval.requested | Server→Client | Gateway needs user approval |
| exec.approval.resolved | Server→Client | Approval result confirmed |
| exec.approval.resolve | Client→Server | Submit decision (allow-once/allow-always/deny) |
| sessions.patch | Client→Server | Set execAsk and other session params |

---

## Infrastructure State

### Nodes
| Node | Role | Tailscale IP | Status |
|------|------|-------------|--------|
| KILO | Brain + Interface | 100.127.23.52 | ✅ Online |
| CEG | Toolbox + Storage | 100.100.101.1 | ✅ Online |

### CEG Services
| Service | Port | Status |
|---------|------|--------|
| SearXNG | 8888 | ✅ Running |
| n8n | 5678 | ✅ Running |
| CXDB | 9009/9010 | ✅ Running |
| Veritas-Kanban | 3001 | ✅ Running |
| Usage Tracker | 3002 | ✅ Running |
| AgenticMail | 3100 | ✅ Running |
| ccode dispatch | 3003 | ✅ Running |

### Models — Current (post Session 15 stack reset)
| Model | Role | reasoning | contextWindow | Tools |
|-------|------|-----------|---------------|-------|
| gpt-oss:20b | Primary — general + tools | false | 131072 | ✅ |
| qwen2.5-coder:14b | Code generation/debugging | false | 131072 | ✅ |
| qwen3-vl:8b | Vision/OCR | false | 131072 | unverified |

**Do not add qwen3:14b back.** Confirmed behavioral bug on tool calls — gets stuck in reasoning trace with no final answer. Research report on file.

**reasoning: false is correct for all models.** Setting true causes OpenClaw to send system prompt as `developer` role — Ollama silently drops it. No upstream fix. qwen3 models reason natively regardless of flag.

### OpenClaw — Current
| Setting | Value |
|---------|-------|
| Version | v2026.3.1 |
| Config (host) | `C:\Users\PLUTO\openclaw_config\openclaw.json` |
| Latest backup | `C:\Users\PLUTO\openclaw_config\openclaw.json.bak4` |
| API mode | Native Ollama (no /v1) |
| baseUrl | `http://host.docker.internal:11434` |
| Heartbeat | Disabled (every: "0m") |
| thinkingDefault | "off" |
| Model config | Explicit per-model (not auto-discovery) |
| compaction.reserveTokensFloor | 4000 |
| memoryFlush.enabled | true |
| memoryFlush.softThresholdTokens | 2000 |
| Flush trigger | ~122,000 tokens (effectively never fires) |
| execAsk valid values | "off", "on-miss", "always" only |
| gateway.auth.token | References `${OPENCLAW_GATEWAY_TOKEN}` env var |
| Model `name` field | Required on every model entry — omitting causes crash loop |
| Gateway restart method | `docker compose down` + `up -d` (restart command has OCI namespace error) |

### ZuberiChat
| Fact | Detail |
|------|--------|
| Version | v1.0.2 |
| Repo | `C:\Users\PLUTO\github\Repo\ZuberiChat` |
| Installed | `C:\Program Files\Zuberi\zuberichat.exe` |
| Font | Segoe UI, 14px |
| Message colors | User: white (--text-primary), Assistant: amber (--text-ember) |
| Message alignment | User messages left-aligned |
| Sidebar | Hidden (code preserved, comment markers in App.tsx + Titlebar.tsx) |
| Kanban | Bottom bar, adjacent to model indicator |
| Markdown | react-markdown + remark-gfm + react-syntax-highlighter |
| Structured blocks | ToolCallBlock, ToolResultBlock (custom components) |
| Permission selector | 4 modes, functional, backend-aware |
| Update system | One-click via scripts/update-local.ps1 |
| Copy button | CopyButton.tsx — hover top-right, raw text, 1.5s checkmark |
| Tests | 155/155 |
| Browser preview | Mock layer at localhost:3000 — see ccode preview section above |

### CXDB State
| Field | Value |
|-------|-------|
| Context | 8 |
| Turns written | 10-25 |
| Turn 23 | Mission-Aegis research (manually recovered) |
| Turn 25 | Post-fix write validation |
| Schema | zuberi.memory.Task, type_version: 1 |
| Correct API | `http://100.100.101.1:9010/v1/contexts/8/turns` (port 9010, not 9009) |

### Key File Paths
| File | Purpose |
|------|---------|
| `C:\Users\PLUTO\OneDrive\Documents\AIAgent\Staging\Claude\CCODE-HANDOFF.md` | ccode operations handoff — start every prompt with this |
| `C:\Users\PLUTO\openclaw_config\openclaw.json` | OpenClaw config (host) |
| `C:\Users\PLUTO\openclaw_workspace\` | Workspace .md files |
| `C:\Users\PLUTO\github\Repo\ZuberiChat\` | App repo |
| `C:\Users\PLUTO\github\Repo\ZuberiChat\scripts\update-local.ps1` | One-click update |
| `C:\Users\PLUTO\github\Repo\ZuberiChat\scripts\generate-version.ps1` | Version.json generator |
| `C:\Users\PLUTO\github\Repo\ZuberiChat\src\lib\platform.ts` | Browser preview mocks |
| `C:\Users\PLUTO\github\Repo\ZuberiChat\src\lib\permissionPolicy.ts` | Approval policy engine |
| `C:\Users\PLUTO\github\Repo\ZuberiChat\.openclaw.local.json` | ZuberiChat gateway token |
| `C:\Users\PLUTO\.openclaw.local.json` | USERPROFILE gateway token |

---

## Lessons Added This Session

### Model Stack
61. **qwen3:14b stuck-in-reasoning bug** — confirmed behavioral issue on tool/function calls. Model outputs only reasoning trace, never final answer. 14B-specific. Do not add back to the stack.
62. **`<think>` token injection does not work in Ollama** — Ollama ignores it as plain text. Correct mechanism: `/think` or `/no_think` appended to user message, or `think: true/false` in `/api/chat` call.
63. **Ollama thinking output separation** — when `think: true`, Ollama places trace in `message.thinking`, not `message.content`. No leakage on native API when correctly configured.
64. **OpenClaw model entry requires `name` field** — omitting `name` from a model entry in `models.providers.ollama.models` causes a crash loop. Always include it.
65. **Gateway restart method** — `docker compose restart` fails with OCI namespace error on the CLI container. Use `docker compose down` + `docker compose up -d` for clean cycle.

### CXDB
66. **CXDB has no search** — retrieval is by context ID and turn index only. No keyword or semantic query support. For search over stored turns, Chroma is required.
67. **CXDB at scale** — large contexts slow reads; blob cache causes memory pressure above ~4GB; async/batched writes needed under heavy load. Use pagination and context sharding for high-volume logging.

---

## What To Do Next

1. **Send RTL-057 fix prompt** — it's written above, ready to paste into ccode. This is the first thing to do.
2. **RTL-056 workspace context audit** — send the read-only diagnostic prompt after RTL-057 lands. No code changes, just measurement.
3. **RTL-047 Phase 2 ToolApprovalCard** — design is approved and fully specified above. Write the implementation prompt after RTL-057 is confirmed.
4. **RTL-058 Phase 1** — model router static rules. Ready to implement after RTL-047 Phase 2.
5. **Talk to Zuberi** — the infrastructure is largely complete. The story starts when James talks to Zuberi directly about real things.

---

*Architect 15 signing off. Stack reset complete — 3 clean models, no orphans, OpenClaw and Ollama in sync. qwen3 removed (behavioral bug confirmed by deep research). RTL-057 fix prompt ready. 155 tests passing.*
