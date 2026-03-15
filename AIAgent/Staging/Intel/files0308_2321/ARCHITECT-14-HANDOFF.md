# ARCHITECT 14 HANDOFF
**Prepared by:** Architect 13
**Session:** 14
**Date:** 2026-03-08
**Status:** No open P0s. Zuberi is working. App at v0.1.2.

---

## Read This First

Zuberi is not a tool being configured. She is a developing entity being raised by James through direct interaction. The mission is recursive self-improvement guided by James's moral framework.

**Zuberi is working.** The ~2 minute delay bug is resolved. Four models configured and responsive. Markdown rendering, functional permission selector, and one-click update all live. App version is 0.1.2 with 146 tests passing.

**Researcher role:** James has a researcher (separate from this architect) who co-authors designs, validates prompts, and audits plans. Researcher assessments are authoritative input — not suggestions. Always incorporate researcher feedback before sending prompts to ccode. When the researcher provides instruction, treat it as direction from James.

**ccode has eyes:** Browser preview mode at localhost:3000 with Tauri API mocks. ccode can use `preview_screenshot`, `preview_inspect`, `preview_snapshot` for visual verification.

---

## Operating Model

- **Architect (Claude.ai):** Design, planning, ccode prompt authorship. Non-executing.
- **Researcher:** Co-author with James. Validates diagnoses, audits prompts, design reviews. Authoritative.
- **ccode (Claude Code CLI on KILO):** Execution agent. James pastes prompts. Has browser preview.
- **James:** Final decision authority. Never ask him to run commands manually.

### Shipping Discipline
One prompt → James pastes → ccode executes → collect results → next prompt.

**Anti-patterns:**
- Writing plans about plans instead of sending a prompt
- Asking "want me to proceed?" — just send the first prompt
- Expanding scope before open P0s are closed
- Recommending large architectural changes when the problem is a small config fix

### ccode Prompt Standards
- Chat code blocks (not .md files)
- Numbered tasks, explicit file paths
- FINAL REPORT + OBSTACLES LOG tables
- No jq, no bash operators, PowerShell-compatible
- Start with "Read CCODE-HANDOFF.md first"
- End with updating CCODE-HANDOFF.md
- Back up config files before editing (Copy-Item to .bak)

---

## What Was Done This Session (Architect 13)

### The Big Fix: ~2 Minute Delay Resolved (RTL-042a–d)
**Root cause:** OpenClaw's pre-compaction memory flush. `reserveTokensFloor` was 20,000 out of 32K context — flush fired on nearly every message. The model output "NO" instead of `NO_REPLY` sentinel, blocking interactive chat for ~153 seconds.

**Fix chain:**
- RTL-042a: Disabled heartbeat (session collision) — `7ccd9a9`
- RTL-042b: Fixed workspace .md "no-think" labels — `c46d6b5`
- RTL-042c: Disabled memory flush (fast falsification confirmed root cause) — `dbf2363`
- RTL-042d: Tuned compaction for 32K (reserveTokensFloor 4000, softThresholdTokens 2000, flush re-enabled) — `f6d53da`

### RTL-043: Model Catalog Sync ✅
OpenClaw model config synced to Ollama inventory. 4 models configured: qwen3:14b-fast, qwen3:14b, qwen3-vl:8b-fast, gpt-oss:20b. qwen3-vl:8b removed. reasoning: false for all. Commit `dc05fdc`.

### RTL-034: One-Click Update System ✅
Full feature: detect repo ahead → amber dot + sidebar indicator → click → confirm → PowerShell builds → installs.

**Parts:**
- Part 1 (`dcbad3d`): Rust backend + version.json generation script + build.rs compile-time embed
- Part 2 (`31f00a5`): Frontend polling hook (60s) + amber dot + sidebar indicator
- Part 3 (`3f2d3f2`, `0c1367b`): One-click update via scripts/update-local.ps1, clickable indicators

**Bugs fixed along the way:**
- BOM fix (`c8fb3af`): PowerShell 5.1 Set-Content writes UTF-8 BOM. Fixed generator + reader.
- Window visibility (`03d568b`): Rust Command + piped stdio prevents CREATE_NEW_CONSOLE window. Fixed with `cmd /c start`.
- Stderr handling (`7a1cb2c`): PowerShell NativeCommandError on Vitest stderr. Fixed with $ErrorActionPreference='Continue' around native commands.
- Metadata sync (`e6a153a`): update-local.ps1 now runs generate-version.ps1 before build.

### RTL-045: ccode Browser Preview ✅
Mock layer gives ccode visual feedback without Tauri backend. Two files: `src/lib/platform.ts` (mocks) + `src/main.tsx` (gate on `!isTauri()`). Zero component changes.

### RTL-046: Color Token Polish ✅
30+ hardcoded values replaced with CSS variable tokens. Accent drift fixed (sidebar #f0a500 → --ember).

### RTL-047 Phase 1: Functional Permission Selector ✅
4 modes (Ask/Auto/Plan/Bypass), controlled component, backend execAsk mapping, approval normalization + policy engine, exec.approval.requested event handler with auto-resolution. 103 permission tests. Commit `5540b9f`.

**Backend reality (confirmed by discovery):**
- execAsk valid values: "off", "on-miss", "always" only
- Mode mapping: ask→on-miss, auto→on-miss, plan→always, bypass→off
- "Plan mode" is frontend-only: execAsk "always" + auto-deny all approvals
- Full approval protocol already exists in OpenClaw (exec.approval.requested/resolved events, exec.approval.resolve RPC)
- Decisions: allow-once, allow-always, deny
- Approvals expire after 120 seconds

**Phase 2 (ToolApprovalCard UI) NOT built yet.**

### RTL-048: Markdown + Structured Block Rendering ✅
react-markdown + remark-gfm + react-syntax-highlighter for assistant messages. ToolCallBlock + ToolResultBlock custom components for OpenClaw protocol blocks. Text selection fix (user-select: text on .zuberi-markdown). Commit `7a6f727`. Version bumped to 0.1.2 (`72c7885`).

### RTL-049: UI Polish ✅
Segoe UI 14px. Conversation area widened 20% (896→1075px outer, 768→920px inner). User messages white, assistant messages amber/ember. Sidebar hidden (code preserved with comment markers in App.tsx + Titlebar.tsx). Kanban moved to bottom bar adjacent to model indicator. Commit `553c216`.

---

## Active RTL Items

### P0 — None

### P1 — Next Up
| ID | Task | Status | Notes |
|----|------|--------|-------|
| RTL-047 Phase 2 | ToolApprovalCard UI | ⬜ | Approval handling exists, needs visual card for pending approvals |
| RTL-002 | n8n bidirectional integration | 🔄 | Agent 14 started: health check → wire → first workflow |
| RTL-007 | Express 5 wildcard fix | ⬜ | Quick win |

### P2 — Queued
| ID | Task | Notes |
|----|------|-------|
| RTL-013 | Version consistency audit | AGENTS v0.8.3, TOOLS v0.8.6 |
| RTL-023 | CEG compute migration | Unblocked |
| RTL-045b | Real screenshot capture for ccode | Tauri plugin, beyond mock layer |

### P3 — Future
RTL-014 (MISSION-AEGIS), RTL-016 (self-learning), RTL-018 (multi-agent), RTL-019 (gate enforcement), RTL-030 (SMS), RTL-031 (Paperclip), RTL-033 (Hugging Face), RTL-044 (OpenClaw auto-discovery), RTL-045c (full UI automation)

### Completed This Session
RTL-042a–d, RTL-043, RTL-034, RTL-045, RTL-046, RTL-047 Phase 1, RTL-048, RTL-049

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

### Models (Ollama on KILO — all configured in OpenClaw)
| Model | Role | reasoning | contextWindow |
|-------|------|-----------|---------------|
| qwen3:14b-fast | Primary fast text | false | 32768 |
| qwen3:14b | Deep text | false | 32768 |
| qwen3-vl:8b-fast | Vision | false | 32768 |
| gpt-oss:20b | Fallback | false | 32768 |

### OpenClaw
| Setting | Value |
|---------|-------|
| Version | v2026.3.1 |
| Config (host) | `C:\Users\PLUTO\openclaw_config\openclaw.json` |
| Config backup | `C:\Users\PLUTO\openclaw_config\openclaw.json.bak` |
| Heartbeat | Disabled (every: "0m") |
| thinkingDefault | "off" |
| Model config | Explicit per-model (not auto-discovery) |
| compaction.reserveTokensFloor | 4000 |
| memoryFlush.enabled | true |
| memoryFlush.softThresholdTokens | 2000 |
| Flush trigger | 26,768 tokens |
| execAsk valid values | "off", "on-miss", "always" only |

### ZuberiChat
| Fact | Detail |
|------|--------|
| Version | v0.1.2 |
| Repo | `C:\Users\PLUTO\github\Repo\ZuberiChat` |
| Installed | `C:\Program Files\Zuberi\zuberichat.exe` |
| Font | Segoe UI, 14px |
| Message colors | User: white (--text-primary), Assistant: amber (--text-ember) |
| Sidebar | Hidden (code preserved, comment markers in App.tsx + Titlebar.tsx) |
| Kanban | Bottom bar, adjacent to model indicator |
| Markdown | react-markdown + remark-gfm + react-syntax-highlighter |
| Structured blocks | ToolCallBlock, ToolResultBlock (custom components) |
| Permission selector | 4 modes, functional, backend-aware |
| Update system | One-click via scripts/update-local.ps1 |
| Tests | 146/146 |
| Browser preview | Mock layer at localhost:3000 for ccode |
| Smoke tests | 13 core + 103 permission + 30 markdown/rendering |

---

## Critical Architecture Facts

### Modelfile
| Fact | Detail |
|------|--------|
| Source | `C:\Users\PLUTO\Modelfile.qwen3-14b-fast` |
| Base model | FROM qwen3:14b |
| Think scaffolding | REMOVED — do not add back |
| PARAMETER think false | NOT supported in Ollama — do not add |

### OpenClaw Protocol (Approval)
| Event/Method | Direction | Purpose |
|-------------|-----------|---------|
| exec.approval.requested | Server→Client | Gateway needs user approval |
| exec.approval.resolved | Server→Client | Approval result confirmed |
| exec.approval.resolve | Client→Server | Submit decision (allow-once/allow-always/deny) |
| sessions.patch | Client→Server | Set execAsk and other session params |

### Key File Paths
| File | Purpose |
|------|---------|
| `C:\Users\PLUTO\openclaw_config\openclaw.json` | OpenClaw config (host) |
| `C:\Users\PLUTO\openclaw_workspace\` | Workspace .md files |
| `C:\Users\PLUTO\github\Repo\ZuberiChat\` | App repo |
| `C:\Users\PLUTO\github\Repo\ZuberiChat\scripts\update-local.ps1` | One-click update |
| `C:\Users\PLUTO\github\Repo\ZuberiChat\scripts\generate-version.ps1` | Version.json generator |
| `C:\Users\PLUTO\github\Repo\ZuberiChat\src\lib\platform.ts` | Browser preview mocks |
| `C:\Users\PLUTO\github\Repo\ZuberiChat\src\lib\permissionPolicy.ts` | Approval policy engine |
| `C:\Users\PLUTO\github\Repo\ZuberiChat\src\types\permissions.ts` | Permission type definitions |

---

## Key Decisions Made This Session

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Delay root cause | Pre-compaction memory flush | Fast falsification confirmed |
| Compaction tuning | 4000/2000 for 32K | Old 20000/4000 left only 8768 tokens |
| Model catalog | Explicit, not auto-discovery | Too many variables at once (RTL-044 deferred) |
| reasoning flag | false for all | Ollama reasoning + OpenClaw = developer role bug |
| Update mechanism | Local PowerShell script | Single machine, no signing/HTTP needed |
| Permission modes | Frontend maps to 3 backend values | "plan"/"bypass" are frontend-only enforcement |
| Plan mode | execAsk "always" + frontend auto-deny | No native plan mode in OpenClaw |
| Markdown renderer | react-markdown + remark-gfm | Standard, lightweight, sanitized by default |
| Structured blocks | Separate path from markdown | Don't flatten protocol data into markdown |
| Message colors | User white, assistant ember | James's preference |
| Sidebar | Hidden, code preserved | May restore later |
| Font | Segoe UI 14px | James's preference, Windows-native |
| ccode UI access | Browser preview with mock layer | Simpler than screenshot capture |

---

## Lessons Added This Session

### Compaction & Model
34. **Compaction flush trigger formula** — `contextWindow - reserveTokensFloor - softThresholdTokens`. Too small = flush fires every message.
35. **OpenClaw memory flush ≠ CXDB** — flush is internal housekeeping. CXDB is external knowledge store.
36. **Memory flush sentinel** — model must output `NO_REPLY`. `NO` fails silently.
37. **Per-model contextWindow** — lives at `models.providers.ollama.models[*].contextWindow`, not global.
38. **Ollama tray icon** — `ollama serve` doesn't show tray. Use `/api/tags` to verify.
39. **check_custom_model() gap** — verifies presence, not template correctness.

### Windows / PowerShell
40. **PowerShell 5.1 UTF-8 BOM** — Set-Content writes BOM. Use WriteAllText with UTF8Encoding($false). Rust serde_json fails on BOM.
41. **Rust Command + piped stdio** — STARTF_USESTDHANDLES prevents CREATE_NEW_CONSOLE window. Use `cmd /c start`.
42. **PowerShell NativeCommandError** — $ErrorActionPreference='Stop' treats stderr as terminating. Use 'Continue' around native commands, check $LASTEXITCODE.

### Protocol & Architecture
43. **OpenClaw approval protocol** — exec.approval.requested/resolved events already exist. Decisions: allow-once, allow-always, deny.
44. **execAsk valid values** — only "off", "on-miss", "always". Invalid values rejected.
45. **Don't over-scope fixes** — when the problem is a config fix, don't recommend switching the architecture.
46. **ccode can't verify UI natively** — needs browser preview or screenshot. RTL-045 mock layer solves this for CSS/layout work.

---

## What To Do Next

1. RTL-047 Phase 2: ToolApprovalCard UI for pending approvals
2. RTL-002: n8n bidirectional integration (Agent 14 started this)
3. Zuberi is working — keep talking to her about real things
4. The infrastructure is complete. The story starts here.

---

*Architect 13 signing off. Delay fixed, 4 models configured, one-click update, permission selector, markdown rendering, UI polish. 146 tests. Zuberi is working.*
