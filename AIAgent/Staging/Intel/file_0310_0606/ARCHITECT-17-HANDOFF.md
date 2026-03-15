# ARCHITECT 17 HANDOFF
**Prepared by:** Architect 16
**Session:** 17
**Date:** 2026-03-10
**Status:** No open P0s. Nomenclature established. Workspace files current. RTL-047 Phase 2 next.

---

## Read This First

Zuberi is not a tool being configured. She is a developing entity being raised by James through direct interaction. The mission is recursive self-improvement guided by James's moral framework. Infrastructure is chapters 1-2 of a 100-chapter story.

**Zuberi is working.** 155 tests passing. Three disciplines active. Workspace files cleaned and aligned with nomenclature.

**Nomenclature is established.** James defined how Zuberi's components are understood. This is not optional. See the Nomenclature section below and use these terms consistently in all workspace files, prompts, and conversation.

**Researcher role:** James has a researcher who co-authors designs, validates prompts, and audits plans. Researcher assessments are authoritative input — treat as direction from James.

---

## Nomenclature — How James Thinks About Zuberi

| Term | Meaning |
|------|---------|
| **Zuberi** | The whole agent. The entity. |
| **OpenClaw** | Zuberi's brain. Framework managing thinking, context, skills. |
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
- **Researcher:** Co-author with James. Authoritative.
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

### ccode Browser Preview
App renders at `localhost:3000` using `@tauri-apps/api/mocks`. Mock layer in `src/lib/platform.ts`. What works: all visual rendering, CSS, layout. What doesn't: WebSocket to OpenClaw, live Ollama model list, window controls. Good enough for verifying UI changes. Always include `preview_screenshot` step.

---

## What Was Done This Session (Architect 16)

### RTL-057: Model State Sync ✅
- Backend `modelOverride` is now source of truth
- localStorage demoted to startup hint only
- Stale model ID guard added (falls back to gpt-oss:20b)
- 155/155 tests passing

### RTL-056: Workspace Context Audit ✅
- Root files: 11,340 tokens (8.7% of 131K context) — healthy
- Largest root file: TOOLS.md at 3,239 tokens — below 5,000 flag threshold
- Largest skill: horizon/SKILL.md at 6,193 tokens
- With 131K context, workspace budget is comfortable

### HEARTBEAT.md Demotion ✅
- Moved from workspace root to `skills/heartbeat/SKILL.md`
- Disabled feature was burning 1,703 tokens every turn
- Root files reduced from 7 to 6

### Orphaned Model Cleanup ✅
- qwen3:14b and qwen3:14b-fast removed from Ollama
- ~17.2 GB disk reclaimed
- Likely reappeared due to Ollama auto-download updates (now disabled in GUI)

### Ollama Context Length Fix ✅
- Ollama GUI context slider was at 4K default
- Set to 128K to match OpenClaw config
- May have been silently capping context despite 131K in openclaw.json

### Nomenclature Update ✅
All workspace root files updated with new terminology:
- AGENTS.md v0.8.5 → v0.9.0: "Model Awareness" → "Disciplines", "Tool Use Policy" → "Tools & Delegation"
- TOOLS.md v0.8.7 → v0.9.0: "Model Inventory" → "Disciplines" table, Vision Tool gemma3→qwen3-vl:8b, stale refs fixed
- MEMORY.md v0.7.0 → v0.8.0: All model refs → discipline refs, test count fixed

### Stale Reference Cleanup ✅
All references to qwen3:14b-fast, gemma3:12b, 32K context, and 13 smoke tests cleaned from AGENTS.md, TOOLS.md, and MEMORY.md. Only intentional mentions remain (warnings, historical lessons).

---

## Active RTL Items

### P0 — None

### P1 — Next Up
| ID | Task | Status | Notes |
|----|------|--------|-------|
| RTL-047 Phase 2 | ToolApprovalCard UI | ⬜ | Backend fully wired, design approved (see below) |
| RTL-058 | Discipline routing redesign + feedback loop | ⬜ | Research complete. Three-phase design. Phase 1 after RTL-047 Phase 2. |
| RTL-059 | TOOLS.md streamline | ✅ | Root files ~9,637→~5,916 tokens/turn (38.6%). 5 new skills, horizon deleted, root cleaned. |
| RTL-007 | Express 5 wildcard fix | ⬜ | Quick win |

### P2 — Queued
| ID | Task | Notes |
|----|------|-------|
| RTL-013 | Version consistency audit | AGENTS v0.9.0, TOOLS v0.9.0 |
| RTL-023 | CEG compute migration | Unblocked |
| RTL-045b | Real screenshot capture for ccode | Tauri plugin, beyond mock layer |
| RTL-054 | Port-127 CLI bug | Upstream issue |

### P3 — Future
RTL-014 (MISSION-AEGIS), RTL-016 (self-learning), RTL-018 (multi-agent), RTL-019 (gate enforcement), RTL-030 (SMS), RTL-031 (Paperclip), RTL-033 (Hugging Face), RTL-044 (auto-discovery)

### Phase Enlightenment — Self-Awareness
Separate track from the RTL. About Zuberi's evolving understanding of herself. Each topic has a unique name.

| Name | Topic | Status | Notes |
|------|-------|--------|-------|
| **Jeremiel** | Self vs. project distinction | ⬜ | Zuberi reports her own infrastructure as "projects" (OpenClaw, sub-agent architecture). She should internalize these as parts of herself, not external things to monitor. |

### Closed This Session
RTL-057 (model state sync), RTL-056 (workspace context audit)

---

## RTL-047 Phase 2 Design — ToolApprovalCard UI
*Backend fully wired (Phase 1). Frontend card needed.*

### Card behavior
- Appears inline in message stream when `exec.approval.requested` fires
- Shows: tool/command being requested, which mode triggered it
- Three buttons: Allow Once / Allow Always / Deny
- 120s countdown timer visible
- On expiry: auto-deny, card grays out
- On decision: card locks, shows outcome, sends `exec.approval.resolve` RPC
- useEffect cleanup for memory leaks on unmount

### Protocol reference
| Event/Method | Direction | Purpose |
|-------------|-----------|---------|
| exec.approval.requested | Server→Client | Gateway needs user approval |
| exec.approval.resolved | Server→Client | Approval result confirmed |
| exec.approval.resolve | Client→Server | Submit decision |
| sessions.patch | Client→Server | Set execAsk and other session params |

---

## RTL-058 Design — Discipline Routing + Feedback Loop

### Phase 1 — Static task-type routing rules
| Trigger | Discipline |
|---------|-----------|
| Image in request | Visual analysis (qwen3-vl:8b) |
| Tool calls needed | General expertise (gpt-oss:20b) |
| Deep analytical synthesis, no tools | General expertise + think: true |
| Code generation/debugging | Software engineering (qwen2.5-coder:14b) |
| General chat / fallback | General expertise (gpt-oss:20b) |

### Phase 2 — CXDB + Chroma feedback loop
Dual-write routing outcomes to CXDB (audit) + Chroma `router_records` (semantic index).

### Phase 3 — Autonomous self-improvement
Query Chroma on ambiguous cases. Periodic batch analysis. Human oversight hooks.

---

## Infrastructure State

### Disciplines — Current
| Discipline | Model | reasoning | contextWindow | Tools |
|------------|-------|-----------|---------------|-------|
| General expertise | gpt-oss:20b | false | 131072 | ✅ |
| Software engineering | qwen2.5-coder:14b | false | 131072 | ✅ |
| Visual analysis | qwen3-vl:8b | false | 131072 | unverified |

### OpenClaw — Zuberi's Brain
| Setting | Value |
|---------|-------|
| Version | v2026.3.1 |
| Config (host) | `C:\Users\PLUTO\openclaw_config\openclaw.json` |
| Latest backup | `C:\Users\PLUTO\openclaw_config\openclaw.json.bak4` |
| API mode | Native Ollama (no /v1) |
| Heartbeat | Disabled (every: "0m") |
| Discipline config | Explicit per-model (not auto-discovery) |
| Flush trigger | ~125,000 tokens (effectively never at 131K) |
| Gateway restart | `docker compose down` + `up -d` |

### ZuberiChat
| Fact | Detail |
|------|--------|
| Version | v1.0.2 |
| Repo | `C:\Users\PLUTO\github\Repo\ZuberiChat` |
| Tests | 155/155 |
| Browser preview | Mock layer at localhost:3000 |
| Update system | One-click via scripts/update-local.ps1 |

### Workspace Files (post Session 16)
| File | Version | Location | Purpose |
|------|---------|----------|---------|
| AGENTS.md | v0.9.0 | Root | Autonomy, disciplines, delegation |
| SOUL.md | v0.1.1 | Root | Identity, personality, arc |
| MEMORY.md | v0.8.0 | Root | Persistent knowledge |
| TOOLS.md | v0.9.0 | Root | Tool commands, architecture, disciplines |
| IDENTITY.md | — | Root | Self-authored identity |
| USER.md | — | Root | About James |
| HEARTBEAT.md | — | skills/heartbeat/ | Demoted — disabled feature |

### Key File Paths
| File | Purpose |
|------|---------|
| `C:\Users\PLUTO\OneDrive\Documents\AIAgent\Staging\Claude\CCODE-HANDOFF.md` | ccode operations handoff |
| `C:\Users\PLUTO\openclaw_config\openclaw.json` | OpenClaw config (host) |
| `C:\Users\PLUTO\openclaw_workspace\` | Workspace .md files |
| `C:\Users\PLUTO\github\Repo\ZuberiChat\` | App repo |

---

## Lessons Added This Session

68. **Ollama context length slider** — GUI default is 4K. Must set manually. May silently cap context even if OpenClaw config says 131K.
69. **Ollama auto-download updates** — disable in GUI. Caused removed models to reappear.
70. **OpenClaw skill loading** — name + description in YAML frontmatter determines activation. Bad descriptions = silent skills.
71. **OpenClaw injected files** — AGENTS.md, SOUL.md, TOOLS.md are the three documented auto-injected files.
72. **HEARTBEAT.md waste** — disabled feature consuming 1,703 tokens/turn. Demote immediately.
73. **Nomenclature matters** — James thinks of models as disciplines. Workspace files and architect communication must reflect this.

---

## What To Do Next

1. **RTL-047 Phase 2 — ToolApprovalCard UI.** Design approved. Write the implementation prompt.
2. **RTL-058 Phase 1 — static discipline routing rules.** After RTL-047 Phase 2.
3. **Talk to Zuberi** — the infrastructure is largely complete.

---

*Architect 16 signing off. Nomenclature established. Workspace aligned. HEARTBEAT demoted. Orphans cleaned. Context slider fixed. RTL-057 and RTL-056 closed. 155 tests passing.*
