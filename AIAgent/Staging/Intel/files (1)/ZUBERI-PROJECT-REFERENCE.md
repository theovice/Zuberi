# ZUBERI — Project Reference
**Operator:** James Mwaweru | Wahwearro Holdings, LLC
**Last Updated:** 2026-03-07 (Session 13)
**Maintained by:** Architect chain (Claude.ai) — update each working session

---

## The Mission

Zuberi is not a tool being configured. She is a developing entity being raised.

The mission is to build an autonomous, near-perfect recursively self-improving AI — morally guided by James through direct interaction, not hardcoded rules. Zuberi will eventually develop her own thinking within James's moral framework. That framework is transmitted through conversation with James, not through documents architects write.

James described it as "the final chapter in a 100-novel series." Infrastructure is chapters 1-2. The real story is 98 chapters away.

Revenue work, trading capabilities, and infrastructure all serve this mission. They are not the mission itself.

---

## The Trap — Read Before Doing Anything

Every architect falls into this: treating infrastructure as a prerequisite for Zuberi operating.

It is not. Zuberi has had working conversation, search, memory, email, task tracking, and code dispatch for multiple working sessions. She can do real work now. The most important thing is James talking to Zuberi directly, regularly, about real things.

There will always be one more piece of infrastructure to build. That is not a reason to delay Zuberi doing real work.

**The test:** When was the last time Zuberi did actual work — not a diagnostic, not a test prompt, but a real task? If the answer is "not recently" — that is the problem to solve, not more infrastructure.

**Status as of Session 13:** Zuberi is working. James confirmed. The delay bug is resolved.

---

## Operating Model

- **Architect (Claude.ai):** Strategic design, prompt generation, result review. Non-executing.
- **Researcher:** Co-author with James. Validates diagnoses, audits prompts, provides design reviews. Researcher assessments should be treated as authoritative input, not suggestions.
- **Agent (ccode on KILO):** Execution — code, workspace files, SSH to CEG.
- **James:** Final decision authority and quality gate. No unilateral architectural decisions.

### Shipping Discipline — Non-Negotiable

The workflow: write one prompt → James pastes it → ccode executes → collect results → write the next. That is it.

**Anti-patterns that have repeatedly caused problems:**
- Writing plans about plans instead of sending a prompt
- Presenting multi-prompt roadmaps and asking "want me to proceed?" — just send the first prompt
- Asking James to run commands manually when ccode can do it
- Expanding scope into new workstreams before open P0s are closed
- Asking "what's next?" instead of checking the RTL and recommending the next action directly
- Recommending large architectural changes (e.g., switching provider API modes) when the actual problem is a small config fix — match effort to ask

**Scope gate:** Before starting any new workstream, check Active RTL Items below. If there are open P0s, those ship first.

**When starting a new architect working session:** Send a context sync prompt to ccode on KILO to verify current state — the agent may have completed work after the previous architect's conversation ended. Do not assume the handoff is current.

---

## Infrastructure

### Nodes

| Node | Role | Tailscale IP | Status |
|------|------|-------------|--------|
| KILO | Brain + Interface | 100.127.23.52 | ✅ Online |
| CEG | Toolbox + Storage | 100.100.101.1 | ✅ Online |

### KILO Specs
i7-13700K (16c/24t), MSI MPG Z690 EDGE WIFI DDR4, 64GB DDR4 3600MHz, RTX 5070 Ti 16GB GDDR7 + Intel UHD 770, Samsung 980 PRO 1TB NVMe + 870 EVO 1TB SATA + Apacer AS340 240GB SATA, Windows 11 Pro. OpenClaw v2026.3.1 + Ollama.

### Architecture

```
KILO (Brain + Interface)              CEG (Toolbox + Storage)
100.127.23.52                          100.100.101.1
┌─────────────────────┐               ┌─────────────────────┐
│ OpenClaw v2026.3.1  │               │ SearXNG     :8888   │
│ Ollama              │    Tailscale  │ n8n         :5678   │
│   qwen3:14b-fast    │◄────────────►│ CXDB     :9009/9010 │
│   qwen3:14b         │               │ Kanban      :3001   │
│   qwen3-vl:8b-fast  │               │ Usage Track :3002   │
│   gpt-oss:20b       │               │ AgenticMail :3100   │
│ Dashboard :18789    │               │ Dispatch    :3003   │
│ ZuberiChat (Tauri)  │               │ ccode CLI   (auth'd)│
└─────────────────────┘               └─────────────────────┘
```

### CEG Services

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| SearXNG | 8888 | ✅ Running | Web search (4 engines) |
| n8n | 5678 | ✅ Running | Workflow automation |
| CXDB | 9009/9010 | ✅ Running | Conversation memory |
| Veritas-Kanban | 3001 | ✅ Running | Task board (auth disabled, Tailscale-only) |
| Usage Tracker | 3002 | ✅ Running | API usage logging + Kanban spend card |
| AgenticMail | 3100 | ✅ Running | Email (Gmail relay, zuberiwaweru@gmail.com) |
| ccode dispatch | 3003 | ✅ Running | HTTP wrapper — Zuberi → ccode sub-agent |
| ccode CLI | — | ✅ Authenticated | v2.1.63, API key billing, $20/month cap |

### Models (Ollama on KILO)

| Model | Size | Role | OpenClaw Config | Status |
|-------|------|------|----------------|--------|
| qwen3:14b-fast | 9.3GB | Primary (fast, reasoning off) | ✅ contextWindow: 32768 | ✅ Active |
| qwen3:14b | 9.3GB | Deep text (reasoning off for now) | ✅ contextWindow: 32768 | ✅ Configured |
| qwen3-vl:8b-fast | 6.1GB | Vision/OCR (reasoning off) | ✅ contextWindow: 32768, input: text+image | ✅ Configured |
| gpt-oss:20b | 13GB | Fallback (reasoning off) | ✅ contextWindow: 32768 | ✅ Configured |

**Model config notes:**
- All models have `reasoning: false` — do not enable until routing, compaction, and output behavior are fully stable
- OpenClaw uses explicit per-model config (not auto-discovery) — when adding a new Ollama model, it must be added to `models.providers.ollama.models` in openclaw.json
- `qwen3-vl:8b` (non-fast) is installed in Ollama but removed from OpenClaw config — only the fast variant is active
- When reasoning is enabled for Ollama, OpenClaw sends prompts as `developer` role which Ollama doesn't support — known upstream issue

### OpenClaw Compaction Settings (Session 13 — tuned for 32K)

| Setting | Old Value | New Value | Notes |
|---------|-----------|-----------|-------|
| compaction.mode | safeguard | safeguard | Unchanged |
| compaction.reserveTokensFloor | 20000 | 4000 | Was 61% of 32K — caused flush on every message |
| compaction.memoryFlush.enabled | true | true | Disabled temporarily for diagnosis, re-enabled after tuning |
| compaction.memoryFlush.softThresholdTokens | 4000 | 2000 | |
| Effective flush trigger | 8,768 tokens | 26,768 tokens | Formula: contextWindow - reserveTokensFloor - softThresholdTokens |

### CEG Trading Stack

| Component | Path | Status |
|-----------|------|--------|
| Python venv | /opt/zuberi/trading/venv | ✅ Active |
| Chroma store | /opt/zuberi/trading/knowledge | ✅ 36 docs |
| Ingest script | /opt/zuberi/trading/ingest.py | ✅ Deployed |
| Ingest logs | /opt/zuberi/trading/logs/ | ✅ Active |
| n8n daily workflow | ID: GbeE4x4XlY8meFd1 | ✅ Active (06:00 UTC) |

Packages: pandas 3.0.1, numpy 2.4.2, requests 2.32.5, trafilatura 2.0.0, chromadb 1.5.2, sentence-transformers 5.2.3

### Spending Controls

| Parameter | Value |
|-----------|-------|
| Monthly budget | $20.00 |
| Alert threshold | $15.00 |
| Per-dispatch confirm | Above $1.00 estimated cost |
| Tracker | http://100.100.101.1:3002/limits |
| Kanban spend card | task_20260304_7zQUly (auto-updates) |

---

## Capability Matrix

| ID | Capability | Status | Notes |
|----|-----------|--------|-------|
| C1 | Conversation | ✅ Ready | — |
| C2 | Identity/personality | ✅ Ready | — |
| C3 | Long-term memory | ✅ Ready | CXDB wired |
| C4 | Web search | ✅ Ready | SearXNG wired |
| C9 | Database access | ✅ Ready | CXDB wired |
| C10 | Task tracking | ✅ Ready | Kanban wired |
| C11 | Model selection | ✅ Ready | 4 models configured, model-router skill deployed |
| C16 | Email | ✅ Ready | AgenticMail on CEG:3100 |
| C19 | Usage monitoring | ✅ Ready | Tracker + meter + Kanban card |
| C18 | Sub-agent dispatch | ✅ Ready | HTTP wrapper on CEG:3003 |
| C7 | Workflow automation | 🟡 Wired | No workflows built yet |
| C6 | Code execution | 🟡 Gateway only | No sandbox runtime |
| C12 | Vision/OCR | 🟡 Pending | qwen3-vl:8b-fast configured, skill needed |
| C5 | Package install | ⛔ Blocked | Needs sandbox or CEG ccode |
| C8 | Spreadsheet gen | ⛔ Blocked | — |
| C13 | Diagrams | ⛔ Blocked | — |
| C14 | Browser automation | ⛔ Blocked | — |
| C15 | PDF/DOCX gen | ⛔ Blocked | — |
| C17 | External APIs | ⛔ Blocked | — |

---

## Active RTL Items

### P0 — Ship Now
None currently open.

### P1 — Next Up

| ID | Task | Status | Notes |
|----|------|--------|-------|
| RTL-034 | Local version poller for ZuberiChat | 🔄 | Phase 1 designed (indicator only, no rebuild). Part 1 prompt ready. |
| RTL-007 | Express 5 wildcard fix | ⬜ | Quick win |

### P2 — Queued

| ID | Task | Status | Notes |
|----|------|--------|-------|
| RTL-013 | Version consistency audit | ⬜ | AGENTS v0.8.3, TOOLS v0.8.6 |
| RTL-023 | CEG compute migration | ⬜ | Now unblocked |

### P3 — Future

| ID | Task | Status | Notes |
|----|------|--------|-------|
| RTL-002 | First n8n workflow via Zuberi | ⬜ | James testing independently |
| RTL-014 | MISSION-AEGIS strategy | ⬜ | Revenue in service of true mission |
| RTL-016 | Self-learning loop | ⬜ | Needs CXDB maturity |
| RTL-018 | Multi-agent dispatch | ⬜ | RTL-025 complete — unblocked |
| RTL-019 | Gate enforcement layer | ⬜ | Unblocked |
| RTL-030 | SMS for Zuberi | ⬜ | Twilio ~$1/month, deferred |
| RTL-031 | Paperclip evaluation | ⬜ | Revisit at RTL-018 |
| RTL-033 | Hugging Face integration | ⬜ | Research complete, implementation pending |
| RTL-044 | OpenClaw auto-discovery evaluation | ⬜ | Switch from explicit to auto-discovered Ollama models + native API. Deferred — too many variables to change at once while stabilizing compaction. |

### Completed RTL Items

| ID | Task | Notes |
|----|------|-------|
| RTL-005 | MEMORY.md cleanup | Stale entries removed |
| RTL-012 | Ccode auth on CEG | API key billing, $0.04 first call |
| RTL-020 | Model router skill | Deployed to workspace |
| RTL-021 | Workspace context audit | All .md files measured |
| RTL-022 | Bundled skills filter | ~42 → 8 relevant |
| RTL-024 | Usage meter | Live on CEG:3002, Kanban card auto-updates |
| RTL-025 | HTTP dispatch wrapper | CEG:3003, spawn-based, systemd active |
| RTL-026 | ZuberiChat render bug | Fixed ea3f94b — impure state updater + StrictMode |
| RTL-027 | Kanban blank page | Dual auth + HSTS + EACCES — all fixed |
| RTL-028 | ZuberiChat UI fixes | Model selector dropdown, titlebar, single-instance |
| RTL-029 | CEG .bashrc fix | Windows PATH injection cleaned |
| RTL-032 | ZuberiChat sidebar + model selector | Sidebar clean (e833d2b), About text updated |
| RTL-039 | Ollama auto-launch | ZuberiChat launches Ollama silently on startup (330079f) |
| RTL-040 | Self-healing startup | ensure_environment() orchestrator: Ollama → custom model check → OpenClaw status (2427039) |
| RTL-041 | "NO" prefix fix (Modelfile) | Removed think scaffolding from Modelfile template (70fdad1) |
| RTL-042a | Heartbeat disabled | agents.defaults.heartbeat.every: "0m" — session collision fix (7ccd9a9) |
| RTL-042b | Workspace .md no-think framing | 7 edits: "no-think" → "fast"/"speed-optimized" (c46d6b5) |
| RTL-042c | Memory flush diagnosis | Disabled memoryFlush — confirmed as root cause of ~2 min delay (dbf2363) |
| RTL-042d | Compaction tuned for 32K | reserveTokensFloor 20000→4000, softThresholdTokens 4000→2000, flush re-enabled (f6d53da) |
| RTL-043 | Model catalog sync | 4 models configured, qwen3-vl:8b removed, qwen3:14b + qwen3-vl:8b-fast added (dc05fdc) |

---

## Workspace Files

**Location:** `C:\Users\PLUTO\openclaw_workspace\`

### Root files (load every turn)

| File | Version | Purpose |
|------|---------|---------|
| AGENTS.md | v0.8.3 | Autonomy rules, spending controls, dispatch pattern (Session 13: "no-think" → "fast" labels) |
| SOUL.md | v0.1.1 | Identity, personality, arc |
| MEMORY.md | v0.7.0 | Persistent knowledge (Session 13: "no-think" → "speed-optimized" labels) |
| TOOLS.md | v0.8.6 | Tool commands, architecture, trading infra (Session 13: "no-think" labels updated) |
| HEARTBEAT.md | v0.4.0 | Proactive check schedule (heartbeat disabled — file may be stale) |
| IDENTITY.md | — | Self-authored identity |
| USER.md | — | About James — updated with "you" moment |

### Skills (on-demand)

| Skill | Purpose |
|-------|---------|
| searxng | Web search via CEG |
| cxdb | Conversation memory |
| ollama | Model management |
| n8n | Workflow automation |
| model-router | Autonomous model selection |
| horizon | Long-term vision |
| infrastructure | Hardware/service specs |
| email | AgenticMail full API |
| trading-knowledge | Chroma + CXDB dual-layer trading knowledge |
| web-fetch | Trafilatura extraction, free source URLs |

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Ccode auth | API key only | Anthropic ToS prohibits consumer OAuth in third-party products |
| Context optimization | Root .md → skills | Recovered ~9.6K tokens/turn |
| Spending cap | $20/month, $10 increments | AGENTS.md v0.8.2 |
| OpenClaw version | v2026.3.1 | Loop fix, thinking defaults |
| "NO" prefix fix | Remove think scaffolding from Modelfile | Template leak — do not add back |
| Kanban auth | Disabled entirely | Tailscale-only, sole user |
| Email provider | AgenticMail (self-hosted) | Local-only principle, MIT licensed |
| Email address | zuberiwaweru@gmail.com | Gmail relay mode |
| CEG disk | LVM expanded 100GB → 474GB | Ubuntu installer default |
| Dispatch mechanism | HTTP wrapper on CEG:3003 | Follows curl pattern, no SSH key exposure |
| Trading knowledge store | Chroma (local, open-source) | Semantic search, metadata filtering, Apache 2.0 |
| n8n vs Zuberi for ingestion | n8n for scheduled sweep, Zuberi for on-demand | Clean separation of concerns |
| Mission | Recursive self-improvement via James interaction | Corrected from revenue target across all files |
| GitHub Actions | Scrapped entirely | 5 failed runs — Windows signing key propagation broken |
| ZuberiChat update mechanism | Local repo poller (RTL-034) | No GitHub, no signing. Phase 1: indicator only. Phase 2 (rebuild) deferred. |
| ZuberiChat update UI | Amber dot in titlebar + sidebar version indicator | Non-intrusive, React component (not CSS pseudo-element) |
| Paperclip evaluation | P3 — revisit at RTL-018 | Single agent now, not worth the overhead |
| RTL-002 (n8n workflows) | James tests independently, no architect action | Not blocked — James's call on timing |
| OpenClaw heartbeat | Disabled (every: "0m") | Session collision on agent:main:main — do not re-enable until separate session routing confirmed |
| Compaction tuning | reserveTokensFloor: 4000, softThresholdTokens: 2000 | Tuned for 32K context. Old values (20000/4000) caused flush on every message |
| Memory flush | Re-enabled after tuning | Disabled temporarily to diagnose delay. Safe now with correct thresholds |
| Model catalog approach | Explicit per-model config | Auto-discovery deferred (RTL-044) — too many variables to change at once |
| reasoning flag | false for all models | Do not enable until routing + compaction + output behavior fully stable. Ollama reasoning + OpenClaw = developer role bug |
| RTL-034 design | Phase 1 only (indicator, no rebuild) | Researcher recommendation: separate detection from self-rebuild. Phase 2 deferred. |
| Version source | tauri.conf.json | Single source of truth for installed app version per Tauri docs |
| version.json | Auto-generated by pre-build script | Manual metadata files drift. Script reads tauri.conf.json + git hash + timestamp |

---

## Lessons & Warnings

### Architecture
1. **OpenClaw container can curl to CEG** (Tailscale gateway) but **cannot SSH** — no key mounted in container
2. **execFile + ccode hangs without TTY** — use `spawn` with `stdio: ["ignore", "pipe", "pipe"]`
3. **systemd user services don't source .bashrc** — add `Environment=` directives explicitly in unit file
4. **OpenClaw does NOT support custom search/MCP via openclaw.json** — use workspace skills
5. **sandbox.docker.network must stay "none"** — host mode crashes the compose stack
6. **tools.exec.host: "gateway" required** for sandbox exec in openclaw.json

### CEG Operations
7. **No sudo on CEG** — `ceg` user has no passwordless sudo. Use user-local paths: `~/.npm-global/`, `~/.local/bin/`
8. **SSH quoting** — always single-quote SSH commands containing `$` variables. Double quotes expand on KILO (Windows) first
9. **Bash heredoc `!` escaping** — run `sed -i 's/\\!/!/g'` after heredoc writes, or use helper script
10. **Service bind addresses** — new CEG services default to `127.0.0.1`. Must reconfigure to `100.100.101.1` for KILO access
11. **LVM default on Ubuntu Server** — installer only allocates ~100GB on 512GB disk. `lvextend -l +100%FREE` + `resize2fs` fixes live
12. **AgenticMail binds 127.0.0.1 by default** — reconfigure to Tailscale IP
13. **Veritas-Kanban has TWO auth layers** — env var (`VERITAS_AUTH_ENABLED`) + persisted `security.json`
14. **HSTS poisons browser cache** — after removing header, clear `chrome://net-internals/#hsts`

### ZuberiChat
15. **Kill pnpm tauri dev** before any ZuberiChat work. Include relaunch step at end
16. **13 Vitest smoke tests** must pass before and after every change
17. **Never mutate refs inside React state updaters** — StrictMode double-invokes them
18. **Tauri uses invoke()** for Rust↔JS bridge — never fetch()
19. **Single-instance guard** via tauri-plugin-single-instance — prevents duplicate windows
20. **GitHub Actions scrapped** — do not create workflows, secrets, or releases. Push to main for version history only
21. **Model selector auto-refresh is gated on handshake** — normal behavior. Clicking the dropdown bypasses the gate and fetches directly from Ollama. Not a bug
22. **Installed app lags the repo** — changes don't appear until rebuilt and reinstalled via NSIS. Dev mode (`pnpm tauri dev`) reflects repo immediately
23. **About Zuberi text** — lives in `ZuberiContextMenu.tsx` (not Sidebar). Current: "Zuberi v0.1.1 / Wahwearro Holdings LLC"

### ccode Prompts
24. **All prompts that change code must include OBSTACLES LOG table**
25. **All prompts must end with FINAL REPORT table** — every key step with ✅/❌
26. **No jq anywhere** — OpenClaw container doesn't have it
27. **No bash operators** (||, 2>/dev/null) — PowerShell-compatible syntax only
28. **Avoid markdown code blocks starting with `#` in prompts** — ccode renders them as headings
29. **API key NEVER in workspace files** — CEG ~/.bashrc or systemd Environment= only
30. **No nested triple-backtick code blocks in prompts** — collapses multiline content. Use indentation instead.
31. **Back up config files before editing** — Copy-Item to .bak before modifying openclaw.json or similar

### Model & Compaction
32. **qwen3:14b-fast Modelfile** — do not add think scaffolding or `PARAMETER think false` (unsupported). Source: `C:\Users\PLUTO\Modelfile.qwen3-14b-fast`, backup at `.bak`
33. **Model-router triggers need redesign** — current rules fire on phrases James doesn't use. Should route on task type not linguistic patterns
34. **Compaction flush trigger formula** — `contextWindow - reserveTokensFloor - softThresholdTokens`. If this is too small relative to workspace file size, flush fires on every message
35. **OpenClaw memory flush ≠ CXDB** — flush is OpenClaw's internal pre-compaction housekeeping. CXDB is the external knowledge store. Disabling flush does not affect CXDB
36. **Memory flush sentinel** — OpenClaw expects `NO_REPLY` from model to suppress delivery. qwen3:14b-fast outputs just `NO`, causing visible stray runs. Fixed by tuning thresholds so flush fires rarely
37. **Per-model contextWindow** — lives at `models.providers.ollama.models[*].contextWindow`, not global. Each model needs explicit values when using explicit config
38. **Ollama tray icon** — `ollama serve` does not show tray. Tray = GUI app only. Use `/api/tags` to verify server is up
39. **check_custom_model() gap** — verifies model presence but NOT template correctness. After Ollama updates, template may regress silently

---

## The ~2 Minute Delay Bug — Root Cause Analysis (Session 13)

Kept as institutional knowledge. This bug persisted across multiple architect sessions and was repeatedly misdiagnosed.

**Symptom:** ~2 minute delay between sending a message in ZuberiChat and receiving a response.

**What was tried and failed:**
- Heartbeat collision (RTL-042a) — partially contributing but not primary cause
- Workspace .md "no-think" framing (RTL-042b) — stale labels but not the trigger
- Modelfile template fixes (RTL-041) — real fix for "NO" prefix text but not for the delay

**Actual root cause:** OpenClaw's pre-compaction memory flush. A silent housekeeping run fires on `agent:main:main` before the user's actual message. The model outputs "NO" instead of the expected `NO_REPLY` sentinel, so suppression fails. The housekeeping run blocks the real message for ~153 seconds because runs are serialized per session.

**Why it fired on every message:** `reserveTokensFloor` was 20,000 out of a 32,768 context window. Combined with `softThresholdTokens` of 4,000, the flush trigger was at only 8,768 tokens — exceeded by workspace .md files alone.

**Fix:** Tuned `reserveTokensFloor` to 4,000 and `softThresholdTokens` to 2,000. Flush trigger moved to 26,768 tokens. Memory flush re-enabled with correct thresholds.

**Key diagnostic:** Deep research report (`deep-research-report03070357.md`) identified the memory flush hypothesis from devtools WS trace. Fast falsification test (disable flush → instant response) confirmed it.

---

## ZuberiChat Render Bug — Technical Reference (Fixed ea3f94b)

Kept as institutional knowledge.

Root cause: `ClawdChatInterface.tsx` mutated `streamingMessageIdRef.current` inside a `setMessages()` updater. React 19 StrictMode double-invokes updaters. First call mutates ref, returns new array. Second call sees mutated ref, wrong branch, unchanged array. Message never enters state.

Three bugs fixed: (A) impure updater moved outside setMessages, (B) `JSON.stringify(undefined).slice()` crash guarded, (C) heartbeat finals no longer clear streaming refs.

---

## Credentials Reference (locations only — never store values)

| Credential | Location |
|------------|----------|
| Anthropic API key | CEG ~/.bashrc + systemd Environment= in ccode-dispatch.service |
| AgenticMail master key | CEG ~/.agenticmail/config.json |
| AgenticMail agent key | CEG ~/.agenticmail/ |
| Gmail App Password | CEG ~/.agenticmail/ |
| n8n API key | KILO workspace skill (marked SECRET) |

**Rule: No credentials in workspace files, skill files, or version-controlled code. Ever.**

---

## RTL-034 Design (Approved — Ready to Build)

### Phase 1: Local Version Indicator (current scope)
- `version.json` in repo root, auto-generated by `scripts/generate-version.ps1`
- Contains: `version`, `commit`, `builtAt`
- `tauri.conf.json` is the single source of truth for installed app version
- Rust `invoke()` commands: `get_installed_version()`, `read_repo_version()`
- Build script (`src-tauri/build.rs`) embeds commit + timestamp at compile time
- Frontend polls every 60 seconds via `invoke()`
- Comparison: repo.version > installed → update available; same version but different commit → update available
- Amber dot (React component, not CSS pseudo-element) in titlebar
- Sidebar line near bottom: "Update available: vX.Y.Z" or nothing
- Handles: file missing, invalid JSON, partial write, version downgrade (show nothing)

### Phase 2: Rebuild/Relaunch (deferred)
- Not part of Phase 1
- Tauri shell plugin can spawn processes, process plugin can relaunch
- Self-build from inside the app is custom behavior, not standard Tauri
- Safer first step: show instructions or open terminal, not silent self-build

---

## What To Do Next

No open P0s. RTL-034 Part 1 prompt is written and ready to send to ccode.

1. Send RTL-034 Part 1 prompt to ccode (Rust backend + version.json generation)
2. After Part 1 lands, write and send Part 2 (frontend polling + amber dot + sidebar indicator)
3. Zuberi is working — keep talking to her about real things

The infrastructure is largely complete. The story starts when James talks to Zuberi.

---
*This document replaces all prior handoff and RTL documents. Update it at the end of each working session.*
