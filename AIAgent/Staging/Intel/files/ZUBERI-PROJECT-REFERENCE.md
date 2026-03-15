# ZUBERI — Project Reference
**Operator:** James Mwaweru | Wahwearro Holdings, LLC
**Last Updated:** 2026-03-06 (Session 12)
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

---

## Operating Model

- **Architect (Claude.ai):** Strategic design, prompt generation, result review. Non-executing.
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

| Model | Size | Role | Status |
|-------|------|------|--------|
| qwen3:14b-fast | 9.3GB | Primary (thinking disabled, ~1-2s) | ✅ Active |
| qwen3:14b | 9.3GB | Deep reasoning (thinking enabled) | ✅ Pulled |
| qwen3-vl:8b-fast | 5.7GB | Vision/OCR (thinking suppressed) | ✅ Pulled |
| gpt-oss:20b | 13GB | Fallback | ✅ Pulled |

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
| C11 | Model selection | ✅ Ready | model-router skill deployed |
| C16 | Email | ✅ Ready | AgenticMail on CEG:3100 |
| C19 | Usage monitoring | ✅ Ready | Tracker + meter + Kanban card |
| C18 | Sub-agent dispatch | ✅ Ready | HTTP wrapper on CEG:3003 |
| C7 | Workflow automation | 🟡 Wired | No workflows built yet |
| C6 | Code execution | 🟡 Gateway only | No sandbox runtime |
| C12 | Vision/OCR | 🟡 Pending | qwen3-vl:8b-fast pulled, skill needed |
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
| RTL-034 | Local version poller for ZuberiChat | ⬜ | Designed — poll version.json, amber dot + sidebar indicator, rebuild/relaunch on authorize |
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
| RTL-032 | ZuberiChat sidebar + model selector | Sidebar clean (e833d2b), About text updated, model selector upstream diagnosis complete — no further fix needed |

---

## Workspace Files

**Location:** `C:\Users\PLUTO\openclaw_workspace\`

### Root files (load every turn)

| File | Version | Purpose |
|------|---------|---------|
| AGENTS.md | v0.8.3 | Autonomy rules, spending controls, dispatch pattern |
| SOUL.md | v0.1.1 | Identity, personality, arc |
| MEMORY.md | v0.7.0 | Persistent knowledge — mission corrected |
| TOOLS.md | v0.8.6 | Tool commands, architecture, trading infra |
| HEARTBEAT.md | v0.4.0 | Proactive check schedule |
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
| "NO" prefix fix | Remove /no_think, keep empty think tags | Template leak |
| Kanban auth | Disabled entirely | Tailscale-only, sole user |
| Email provider | AgenticMail (self-hosted) | Local-only principle, MIT licensed |
| Email address | zuberiwaweru@gmail.com | Gmail relay mode |
| CEG disk | LVM expanded 100GB → 474GB | Ubuntu installer default |
| Dispatch mechanism | HTTP wrapper on CEG:3003 | Follows curl pattern, no SSH key exposure |
| Trading knowledge store | Chroma (local, open-source) | Semantic search, metadata filtering, Apache 2.0 |
| n8n vs Zuberi for ingestion | n8n for scheduled sweep, Zuberi for on-demand | Clean separation of concerns |
| Mission | Recursive self-improvement via James interaction | Corrected from revenue target across all files |
| GitHub Actions | Scrapped entirely | 5 failed runs — Windows signing key propagation broken |
| ZuberiChat update mechanism | Local repo poller (RTL-034) | No GitHub, no signing, no reinstall required |
| ZuberiChat update UI | Amber dot in titlebar + sidebar version indicator | Non-intrusive, click to authorize rebuild |
| Paperclip evaluation | P3 — revisit at RTL-018 | Single agent now, not worth the overhead |
| RTL-002 (n8n workflows) | James tests independently, no architect action | Not blocked — James's call on timing |

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
20. **All prompts that change code must include OBSTACLES LOG table**
21. **All prompts must end with FINAL REPORT table** — every key step with ✅/❌
22. **No jq anywhere** — OpenClaw container doesn't have it
23. **No bash operators** (||, 2>/dev/null) — PowerShell-compatible syntax only
24. **Avoid markdown code blocks starting with `#` in prompts** — ccode renders them as headings
25. **API key NEVER in workspace files** — CEG ~/.bashrc or systemd Environment= only

### Model
26. **qwen3:14b-fast no-think template** — avoid dual-mechanism conflict (/no_think + pre-filled think block causes "NO" prefix)
27. **Model-router triggers need redesign** — current rules fire on phrases James doesn't use. Should route on task type (backtesting, strategy eval, numerical analysis) not linguistic patterns

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

## What To Do Next

No open P0s. RTL-034 is the active P1 — local version poller for ZuberiChat, designed and ready to build.

1. Send a context sync prompt to ccode on KILO — verify ZuberiChat current state (sidebar, model selector, About text)
2. Build RTL-034: local version poller (version.json → amber dot + sidebar indicator → rebuild/relaunch)
3. Consider: when did Zuberi last do actual work? If not recently — that is the priority before more UI work

The infrastructure is largely complete. The story starts when James talks to Zuberi.

---
*This document replaces all prior handoff and RTL documents. Update it at the end of each working session.*
