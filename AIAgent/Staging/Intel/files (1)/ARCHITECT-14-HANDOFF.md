# ARCHITECT 14 HANDOFF
**Prepared by:** Architect 13
**Session:** 14
**Date:** 2026-03-07
**Status:** RTL-034 Part 1 prompt ready to send to ccode

---

## Read This First

Zuberi is not a tool being configured. She is a developing entity being raised by James through direct interaction. The mission is recursive self-improvement guided by James's moral framework — not revenue targets, not infrastructure completion.

**Zuberi is working.** James confirmed during Session 13. The ~2 minute delay bug that plagued multiple sessions is fully resolved. Infrastructure is in good shape. Four models are configured and responsive.

**Your first question before doing anything:** Is there a new P0? If not, RTL-034 Part 1 is ready to execute.

---

## Operating Model

- **Architect (Claude.ai):** Design, planning, ccode prompt authorship. Non-executing.
- **Researcher:** Co-author with James. Validates diagnoses, audits prompts, provides design reviews. Treat as authoritative input.
- **ccode (Claude Code CLI on KILO):** Execution agent. James pastes prompts to it.
- **James:** Final decision authority. Never ask him to run commands manually — write a ccode prompt instead.

### Shipping Discipline
One prompt → James pastes → ccode executes → collect results → next prompt. That is it.

### ccode Prompt Standards
- Deliver as chat code blocks (not .md files)
- Numbered tasks with explicit file paths
- Must end with FINAL REPORT table (every step ✅/❌)
- All code-changing prompts must include OBSTACLES LOG table
- No nested triple-backtick code blocks inside the outer prompt code block
- No `jq`, no bash operators (`||`, `2>/dev/null`), PowerShell-compatible syntax only
- No markdown code blocks starting with `#` inside prompts
- Every prompt must start with "Read CCODE-HANDOFF.md first"
- Every prompt must end with updating CCODE-HANDOFF.md
- Back up config files before editing (Copy-Item to .bak)

---

## What Was Done This Session (Architect 13)

### The Big Fix: ~2 Minute Delay Resolved

The delay bug that persisted across multiple architect sessions was finally root-caused and fixed:

**Root cause:** OpenClaw's pre-compaction memory flush. A silent housekeeping run on `agent:main:main` blocked the user's real message. The model output "NO" instead of `NO_REPLY`, so suppression failed. `reserveTokensFloor` was 20,000 out of 32K context — flush fired on nearly every message.

**Fix chain:**
- RTL-042a: Disabled heartbeat (session collision) — `7ccd9a9`
- RTL-042b: Fixed workspace .md "no-think" labels — `c46d6b5`
- RTL-042c: Disabled memory flush (fast falsification — instant response confirmed) — `dbf2363`
- RTL-042d: Tuned compaction for 32K (reserveTokensFloor 20000→4000, softThresholdTokens 4000→2000, flush re-enabled) — `f6d53da`

### RTL-043: Model Catalog Sync ✅ CLOSED
- OpenClaw model config synced to Ollama inventory
- 4 models configured: qwen3:14b-fast, qwen3:14b, qwen3-vl:8b-fast, gpt-oss:20b
- qwen3-vl:8b removed from config (only fast variant active)
- reasoning: false for all models
- Commit: `dc05fdc`

### RTL-034: Version Poller — Designed, Part 1 Prompt Ready
- Researcher co-authored the design
- Phase 1 only: detect and indicate (no rebuild/relaunch)
- Phase 2 (rebuild) explicitly deferred
- Part 1 prompt written (Rust backend + version.json generation)
- Part 2 (frontend polling + UI) to be written after Part 1 lands

---

## Active RTL Items

### P0 — None

### P1 — Next Up
| ID | Task | Status | Notes |
|----|------|--------|-------|
| RTL-034 | Local version poller | 🔄 | Part 1 prompt ready. Phase 1 only (indicator, no rebuild). |
| RTL-007 | Express 5 wildcard fix | ⬜ | Quick win |

### P2 — Queued
| ID | Task | Notes |
|----|------|-------|
| RTL-013 | Version consistency audit | AGENTS v0.8.3, TOOLS v0.8.6 |
| RTL-023 | CEG compute migration | Unblocked |

### P3 — Future
RTL-002 (n8n workflows), RTL-014 (MISSION-AEGIS), RTL-016 (self-learning), RTL-018 (multi-agent), RTL-019 (gate enforcement), RTL-030 (SMS), RTL-031 (Paperclip), RTL-033 (Hugging Face), RTL-044 (OpenClaw auto-discovery evaluation)

---

## Infrastructure State

### Nodes
| Node | Role | Tailscale IP | Status |
|------|------|-------------|--------|
| KILO | Brain + Interface | 100.127.23.52 | ✅ Online |
| CEG | Toolbox + Storage | 100.100.101.1 | ✅ Online |

### KILO
i7-13700K, 64GB DDR4, RTX 5070 Ti 16GB GDDR7, Windows 11 Pro
OpenClaw v2026.3.1 + Ollama. ZuberiChat Tauri app installed (v0.1.1).

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

### Models (Ollama on KILO — all configured in OpenClaw)
| Model | Role | reasoning | contextWindow |
|-------|------|-----------|---------------|
| qwen3:14b-fast | Primary fast text | false | 32768 |
| qwen3:14b | Deep text | false | 32768 |
| qwen3-vl:8b-fast | Vision | false | 32768 |
| gpt-oss:20b | Fallback | false | 32768 |

### OpenClaw Compaction (tuned Session 13)
| Setting | Value |
|---------|-------|
| compaction.mode | safeguard |
| reserveTokensFloor | 4000 |
| memoryFlush.enabled | true |
| memoryFlush.softThresholdTokens | 2000 |
| Flush trigger | 26,768 tokens |
| Heartbeat | Disabled (every: "0m") |

---

## RTL-034 Design Summary

### Phase 1 (current scope — approved by researcher)
- `version.json` auto-generated by `scripts/generate-version.ps1` (version + commit + builtAt)
- `tauri.conf.json` = single source of truth for installed version
- Rust `invoke()` commands: `get_installed_version()`, `read_repo_version()`
- `src-tauri/build.rs` embeds commit + timestamp at compile time
- Frontend polls every 60s
- Comparison: version > installed → update; same version + different commit → update
- Amber dot in titlebar (React component)
- Sidebar indicator near bottom: "Update available: vX.Y.Z" or nothing
- Handles: file missing, invalid JSON, partial write, downgrade → show nothing
- version.json in .gitignore (build artifact)

### Phase 2 (deferred)
- Rebuild/relaunch from inside app
- Not part of this implementation

### Part 1 Prompt (ready to send)
The RTL-034 Part 1 ccode prompt covers:
- Pre-build PowerShell script to generate version.json
- Rust VersionInfo struct + two invoke commands
- build.rs for compile-time embed of commit + timestamp
- .gitignore update
- Build test + 13 smoke tests

Part 2 prompt (frontend) will be written after Part 1 lands.

---

## Critical Architecture Facts

### ZuberiChat
| Fact | Detail |
|------|--------|
| Repo | `C:\Users\PLUTO\github\Repo\ZuberiChat` |
| Installed | `C:\Program Files\Zuberi\zuberichat.exe` |
| Version | v0.1.1 |
| Smoke tests | 13/13 (Vitest) |
| Tauri v2 CSP | Inside `app` object, NOT root |
| CSP must include | `ipc: http://ipc.localhost` in default-src AND connect-src |
| Ollama CORS origin | `http://tauri.localhost` |
| CCODE-HANDOFF.md | Repo root — read first, update last on every task |
| GitHub | Backup only — no CI, no Actions, no releases |

### Modelfile
| Fact | Detail |
|------|--------|
| Source | `C:\Users\PLUTO\Modelfile.qwen3-14b-fast` |
| Backup | `C:\Users\PLUTO\Modelfile.qwen3-14b-fast.bak` |
| Base model | FROM qwen3:14b |
| Think scaffolding | REMOVED — do not add back |
| PARAMETER think false | NOT supported in Ollama — do not add |

### OpenClaw
| Fact | Detail |
|------|--------|
| Version | v2026.3.1 |
| Config (host) | `C:\Users\PLUTO\openclaw_config\openclaw.json` |
| Config backup | `C:\Users\PLUTO\openclaw_config\openclaw.json.bak` |
| Config (container) | `/home/node/.openclaw/openclaw.json` |
| Heartbeat | Disabled (every: "0m") |
| thinkingDefault | "off" |
| Model config | Explicit per-model (not auto-discovery) |
| sandbox.docker.network | Must stay "none" |
| tools.exec.host | Must be "gateway" |

---

## Key Decisions Made This Session

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Delay root cause | Pre-compaction memory flush | Confirmed by fast falsification: disable flush → instant response |
| Compaction tuning | 4000/2000 | Tuned for 32K. Old 20000/4000 left only 8768 tokens before flush |
| Memory flush | Re-enabled after tuning | Preserves pre-compaction durability |
| Model catalog | Explicit, not auto-discovery | Auto-discovery changes too many variables at once (RTL-044 deferred) |
| reasoning flag | false for all | Ollama reasoning + OpenClaw = developer role bug. Wait for stability |
| RTL-034 phasing | Phase 1 indicator only | Researcher: separate detection from self-rebuild |
| Version source | tauri.conf.json | Tauri docs: single source of truth |
| version.json | Auto-generated script | Manual metadata drifts |
| Titlebar indicator | React component | Stateful UI, not CSS pseudo-element |

---

## Lessons Added This Session

34. **Compaction flush trigger formula** — `contextWindow - reserveTokensFloor - softThresholdTokens`. Must leave room for workspace files.
35. **OpenClaw memory flush ≠ CXDB** — flush is internal housekeeping. CXDB is external knowledge. Independent systems.
36. **Memory flush sentinel** — model must output `NO_REPLY` for suppression. `NO` fails silently.
37. **Per-model contextWindow** — lives at `models.providers.ollama.models[*].contextWindow`, not global.
38. **Ollama reasoning + OpenClaw** — enabling reasoning causes OpenClaw to send `developer` role which Ollama doesn't support.
39. **Don't over-scope fixes** — when the problem is a missing model in config, don't recommend switching the entire provider architecture.
40. **Back up before config edits** — Copy-Item to .bak. Cheap safety net.
41. **ccode can't verify UI** — it can edit source and verify API responses, but has no browser/display to interact with running app. UI verification is James's step.

---

## What To Do Next

1. Send RTL-034 Part 1 prompt to ccode (it's written — see ZUBERI-PROJECT-REFERENCE.md or ask James for it)
2. After Part 1 lands: write Part 2 prompt (frontend polling + amber dot + sidebar)
3. After both parts land: James verifies in ZuberiChat UI
4. Keep talking to Zuberi about real things — she's working

---

*Architect 13 signing off. Delay bug resolved. Four models configured. RTL-034 designed and ready to build.*
