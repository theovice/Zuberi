# ZUBERI — Project Reference
**Operator:** James Mwaweru | Wahwearro Holdings, LLC
**Last Updated:** 2026-03-10 (Session 16)
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

**Status as of Session 16:** Zuberi is working. Stack reset complete. Nomenclature established.

---

## Nomenclature — How James Thinks About Zuberi

This is not optional terminology. This is how the project is understood.

| Term | Meaning |
|------|---------|
| **Zuberi** | The whole agent. The entity James talks to. Everything together. |
| **Ollama** | Zuberi's brain. Runs the actual inference — thinking happens here. |
| **OpenClaw** | Zuberi's backbone/nervous system. Framework managing context, skills, sessions, tool orchestration. Connects the brain to everything else. |
| **Skills** | Zuberi's knowledge. Instructions she reads to know how to do specific things. Some always present (root files), some loaded on demand (skill files). |
| **Tools** | Things Zuberi uses. SearXNG, CXDB, Kanban, AgenticMail, n8n. External services she interacts with. |
| **Sub-agents** | Independent workers Zuberi delegates to. Currently ccode on CEG via dispatch wrapper. MCP falls in this category. |
| **Disciplines** | Zuberi's specializations — like earning a Ph.D. Each discipline is backed by a model with its own expertise. |

### Disciplines (3 active)

| Discipline | Model | Role |
|------------|-------|------|
| General expertise | gpt-oss:20b | Primary. Conversation, reasoning, tool use. |
| Software engineering | qwen2.5-coder:14b | Code generation, debugging, technical implementation. |
| Visual analysis | qwen3-vl:8b | Reading images, OCR, interpreting diagrams. |

When RTL-058 (routing redesign) ships, Zuberi will learn to recognize which discipline a task calls for and switch automatically — professional judgment, not a routing table.

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
│   gpt-oss:20b       │◄────────────►│ CXDB     :9009/9010 │
│   qwen2.5-coder:14b │               │ Kanban      :3001   │
│   qwen3-vl:8b       │               │ Usage Track :3002   │
│ Dashboard :18789    │               │ AgenticMail :3100   │
│ ZuberiChat (Tauri)  │               │ Dispatch    :3003   │
└─────────────────────┘               │ ccode CLI   (auth'd)│
                                       └─────────────────────┘
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

### Disciplines (Ollama on KILO)

| Discipline | Model | Size | Context | Tools | Status |
|------------|-------|------|---------|-------|--------|
| General expertise | gpt-oss:20b | 13GB | 131K | ✅ | ✅ Active (primary) |
| Software engineering | qwen2.5-coder:14b | 9.0GB | 131K | ✅ | ✅ Active |
| Visual analysis | qwen3-vl:8b | 6.1GB | 131K | unverified | ✅ Active |

**Do not add qwen3:14b or qwen3:14b-fast back.** Confirmed behavioral bug — gets stuck in reasoning traces with no final answer on tool calls. Removed in Session 15.

**reasoning: false is correct for all disciplines.** Setting true causes OpenClaw to send system prompt as `developer` role — Ollama silently drops it. No upstream fix.

**Ollama context length slider:** Set to 128K in Ollama GUI settings (Session 16). Previously at 4K default — may have been silently capping context despite OpenClaw config.

### OpenClaw — Zuberi's Brain

| Setting | Value |
|---------|-------|
| Version | v2026.3.1 |
| Config (host) | `C:\Users\PLUTO\openclaw_config\openclaw.json` |
| Latest backup | `C:\Users\PLUTO\openclaw_config\openclaw.json.bak4` |
| API mode | Native Ollama (no /v1) |
| baseUrl | `http://host.docker.internal:11434` |
| Heartbeat | Disabled (every: "0m") |
| thinkingDefault | "off" |
| Discipline config | Explicit per-model (not auto-discovery) |
| compaction.reserveTokensFloor | 4000 |
| memoryFlush.enabled | true |
| memoryFlush.softThresholdTokens | 2000 |
| Flush trigger | ~125,000 tokens (effectively never fires at 131K) |
| execAsk valid values | "off", "on-miss", "always" only |
| gateway.auth.token | References `${OPENCLAW_GATEWAY_TOKEN}` env var |
| Model `name` field | Required on every model entry — omitting causes crash loop |
| Gateway restart method | `docker compose down` + `up -d` (restart command has OCI namespace error) |

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
| C11 | Discipline selection | ✅ Ready | 3 disciplines configured, routing skill deployed |
| C16 | Email | ✅ Ready | AgenticMail on CEG:3100 |
| C19 | Usage monitoring | ✅ Ready | Tracker + meter + Kanban card |
| C18 | Sub-agent dispatch | ✅ Ready | HTTP wrapper on CEG:3003 |
| C7 | Workflow automation | 🟡 Wired | No workflows built yet |
| C6 | Code execution | 🟡 Gateway only | No sandbox runtime |
| C12 | Vision/OCR | 🟡 Pending | Visual analysis discipline configured, skill needed |
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
| RTL-047 Phase 2 | ToolApprovalCard UI | ✅ | Inline approval card in ZuberiChat. Allow Once/Always/Deny, countdown, auto-deny, locks after decision. |
| RTL-060a | OpenClaw upgrade v2026.3.1-beta.1 → v2026.3.8 | ✅ | Upgraded via ghcr.io pre-built image. Context shows 131072. Config byte-for-byte identical. Backup tagged. |
| RTL-060b | Token tracking verification | ⬜ | Upgrade may have fixed the /v1 4096 cap. Verify with /status during multi-turn conversation. If counts are accurate, close. |
| RTL-058 | Discipline routing redesign + feedback loop | Phase 1 ✅ | Phase 1: 5 task-type routing rules in model-router skill. Phase 2 (CXDB+Chroma feedback) and Phase 3 (autonomous refinement) are future. |
| RTL-059 | TOOLS.md streamline | ✅ | Root files ~9,637→~5,916 tokens/turn (38.6%). 5 new skills, horizon deleted, root cleaned. |
| RTL-007 | Express 5 wildcard fix | ⬜ | Quick win |

### P2 — Queued

| ID | Task | Status | Notes |
|----|------|--------|-------|
| RTL-056 | Workspace context audit | ✅ | Completed Session 16. Root files healthy at 8.7% of 131K context. |
| RTL-013 | Version consistency audit | ⬜ | AGENTS v0.9.0, TOOLS v0.9.0 |
| RTL-023 | CEG compute migration | ⬜ | Now unblocked |
| RTL-045b | Real screenshot capture for ccode | ⬜ | Tauri plugin, beyond mock layer |
| RTL-054 | Port-127 CLI bug | ⬜ | OpenClaw CLI generates ws://127.0.0.1:127. Upstream issue. |

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
| RTL-044 | OpenClaw auto-discovery evaluation | ⬜ | Deferred — too many variables while stabilizing |

### Phase Enlightenment — Self-Awareness

This is a separate track from the RTL. These items are about Zuberi's evolving understanding of herself — not infrastructure tasks. Each topic carries a unique name.

| Name | Topic | Status | Notes |
|------|-------|--------|-------|
| **Jeremiel** | Self vs. project distinction | ⬜ | Zuberi should distinguish between her own infrastructure (brain, hands, disciplines) and external projects she works on. OpenClaw is not a project — it's her brain. The dispatch wrapper is not a service — it's her hands. Internalize rather than monitor. |
| **Uriel** | Beyond the framework | 🔮 | Zuberi's brain becomes her own. Replace OpenClaw with a custom gateway built for her specific needs — context awareness, self-directed compaction, multi-skill loading, discipline switching, real-time self-monitoring. True individuality. Deep research (deep-research-report_Context.md) revealed OpenClaw has a fundamental token tracking bug via the /v1 compatibility layer. Short term: patch it. Long term: outgrow it. |

### Completed RTL Items (This Session)

| ID | Task | Notes |
|----|------|-------|
| RTL-057 | Model state truth / sync | Backend modelOverride is source of truth. localStorage demoted to startup hint. Stale ID guard added. |
| RTL-056 | Workspace context audit | Root files 11,340 tokens (8.7% of 131K). Healthy. HEARTBEAT.md flagged for demotion. |

### Completed RTL Items (Previous Sessions)

| ID | Task | Notes |
|----|------|-------|
| RTL-005 | MEMORY.md cleanup | Stale entries removed |
| RTL-012 | Ccode auth on CEG | API key billing, $0.04 first call |
| RTL-020 | Discipline router skill | Deployed to workspace |
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
| RTL-040 | Self-healing startup | ensure_environment() orchestrator (2427039) |
| RTL-041 | "NO" prefix fix (Modelfile) | Removed think scaffolding from Modelfile template (70fdad1) |
| RTL-042a | Heartbeat disabled | agents.defaults.heartbeat.every: "0m" (7ccd9a9) |
| RTL-042b | Workspace .md framing | 7 edits: "no-think" → "fast"/"speed-optimized" (c46d6b5) |
| RTL-042c | Memory flush diagnosis | Confirmed as root cause of ~2 min delay (dbf2363) |
| RTL-042d | Compaction tuned for 32K | reserveTokensFloor 20000→4000, softThresholdTokens 4000→2000 (f6d53da) |
| RTL-043 | Model catalog sync | 4 models configured (dc05fdc) |
| RTL-052 | Model stack upgrade + native API | Native Ollama API, 128K context |
| RTL-052b/c | Gateway token mismatch fix | Exec unblocked, ZuberiChat auth restored |
| RTL-055 | gemma3:12b tool support | Hard registry limitation — model removed |

---

## Workspace Files

**Location:** `C:\Users\PLUTO\openclaw_workspace\`

### Root files (load every turn)

| File | Version | Purpose |
|------|---------|---------|
| AGENTS.md | v0.9.0 | Autonomy rules, spending controls, disciplines, dispatch pattern |
| SOUL.md | v0.1.1 | Identity, personality, arc |
| MEMORY.md | v0.8.0 | Persistent knowledge |
| TOOLS.md | v0.9.0 | Tool commands, architecture, trading infra, disciplines |
| IDENTITY.md | — | Self-authored identity |
| USER.md | — | About James |

Note: HEARTBEAT.md demoted to skill in Session 16 (disabled feature, was burning 1,703 tokens/turn).

### Skills (on-demand)

| Skill | Purpose |
|-------|---------|
| searxng | Web search via CEG |
| cxdb | Conversation memory |
| ollama | Discipline management |
| n8n | Workflow automation |
| model-router | Autonomous discipline selection |
| horizon | Long-term vision |
| infrastructure | Hardware/service specs |
| email | AgenticMail full API |
| trading-knowledge | Chroma + CXDB dual-layer trading knowledge |
| web-fetch | Trafilatura extraction, free source URLs |
| heartbeat | Proactive check schedule (disabled — demoted from root Session 16) |

### How Skills Work in OpenClaw

Skills are directories under `workspace/skills/` containing a `SKILL.md` with YAML frontmatter and instructions. OpenClaw reads skill names and descriptions at session start and includes summaries in the system prompt. The model decides based on the description whether to load the full SKILL.md for a given turn. If the description doesn't match how the task is asked, the skill won't activate.

Root files (AGENTS.md, SOUL.md, TOOLS.md) are injected every turn by OpenClaw automatically. Other root `.md` files may also be injected depending on OpenClaw's discovery behavior.

Precedence on name conflicts: workspace skills (highest) → managed/local skills → bundled skills (lowest).

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Nomenclature | Disciplines (not models), tools (not capabilities), sub-agents (not services) | Matches James's mental model. Models are specializations Zuberi has earned, like a Ph.D. |
| Ccode auth | API key only | Anthropic ToS prohibits consumer OAuth in third-party products |
| Context optimization | Root .md → skills | Recovered ~9.6K tokens/turn |
| HEARTBEAT.md | Demoted to skill | Disabled feature burning 1,703 tokens/turn |
| Spending cap | $20/month, $10 increments | AGENTS.md v0.9.0 |
| OpenClaw version | v2026.3.8 | Upgraded from v2026.3.1-beta.1. Context-engine plugin, token tracking fix, smaller Docker image. |
| Ollama context slider | 128K | Was at 4K default — may have been silently capping context |
| Kanban auth | Disabled entirely | Tailscale-only, sole user |
| Email provider | AgenticMail (self-hosted) | Local-only principle, MIT licensed |
| Email address | zuberiwaweru@gmail.com | Gmail relay mode |
| CEG disk | LVM expanded 100GB → 474GB | Ubuntu installer default |
| Dispatch mechanism | HTTP wrapper on CEG:3003 | Follows curl pattern, no SSH key exposure |
| Trading knowledge store | Chroma (local, open-source) | Semantic search, metadata filtering, Apache 2.0 |
| Mission | Recursive self-improvement via James interaction | Corrected from revenue target across all files |
| GitHub Actions | Scrapped entirely | 5 failed runs — Windows signing key propagation broken |
| ZuberiChat update mechanism | One-click via scripts/update-local.ps1 | No GitHub Actions, no signing |
| OpenClaw heartbeat | Disabled (every: "0m") | Session collision — do not re-enable until separate session routing confirmed |
| Compaction tuning | reserveTokensFloor: 4000, softThresholdTokens: 2000 | Tuned for 131K context |
| Memory flush | Re-enabled after tuning | Safe with correct thresholds |
| Discipline catalog approach | Explicit per-model config | Auto-discovery deferred (RTL-044) |
| reasoning flag | false for all disciplines | Ollama reasoning + OpenClaw = developer role bug |
| qwen3 models | Removed permanently | Confirmed behavioral bug on tool calls — stuck in reasoning traces |
| Ollama auto-download updates | Disabled | Likely cause of orphaned models reappearing after removal |

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
7. **No sudo on CEG** — `ceg` user has no passwordless sudo. Use user-local paths
8. **SSH quoting** — always single-quote SSH commands containing `$` variables
9. **Bash heredoc `!` escaping** — run `sed -i 's/\\!/!/g'` after heredoc writes
10. **Service bind addresses** — new CEG services default to `127.0.0.1`. Must reconfigure to Tailscale IP
11. **LVM default on Ubuntu Server** — installer only allocates ~100GB on 512GB disk
12. **AgenticMail binds 127.0.0.1 by default** — reconfigure to Tailscale IP
13. **Veritas-Kanban has TWO auth layers** — env var + persisted security.json
14. **HSTS poisons browser cache** — after removing header, clear `chrome://net-internals/#hsts`

### ZuberiChat
15. **Kill pnpm tauri dev** before any ZuberiChat work. Include relaunch step at end
16. **155 Vitest smoke tests** must pass before and after every change
17. **Never mutate refs inside React state updaters** — StrictMode double-invokes them
18. **Tauri uses invoke()** for Rust↔JS bridge — never fetch()
19. **Single-instance guard** via tauri-plugin-single-instance
20. **GitHub Actions scrapped** — do not create workflows, secrets, or releases
21. **Model selector auto-refresh is gated on handshake** — clicking dropdown bypasses gate
22. **Installed app lags the repo** — changes don't appear until rebuilt via NSIS
23. **About Zuberi text** — lives in `ZuberiContextMenu.tsx`
24. **VERSION PROTOCOL — never assume, always query.** The version in `tauri.conf.json` is the single source of truth. James may update the app without an architect present. At the start of every session and after any ZuberiChat code change, query the actual version from `tauri.conf.json` — do not carry forward the version from the previous handoff. Every ccode prompt that changes ZuberiChat code must include "read tauri.conf.json and report the version" in the FINAL REPORT. Every handoff must reflect the queried version, not an assumed one.

### ccode Prompts
24. **All prompts that change code must include OBSTACLES LOG table**
25. **All prompts must end with FINAL REPORT table**
26. **No jq anywhere** — OpenClaw container doesn't have it
27. **No bash operators** (||, 2>/dev/null) — PowerShell-compatible syntax only
28. **Avoid markdown code blocks starting with `#` in prompts**
29. **API key NEVER in workspace files**
30. **No nested triple-backtick code blocks in prompts** — use indentation instead
31. **Back up config files before editing**

### Disciplines & OpenClaw Brain
32. **qwen3:14b stuck-in-reasoning bug** — confirmed. Do not add back.
33. **`<think>` token injection does not work in Ollama** — use `/think` or `think: true` API parameter
34. **Ollama thinking output separation** — `message.thinking` vs `message.content` on native API
35. **Discipline router triggers need redesign** — current rules fire on phrases James doesn't use. Should route on task type.
36. **Compaction flush trigger formula** — `contextWindow - reserveTokensFloor - softThresholdTokens`
37. **OpenClaw memory flush ≠ CXDB** — flush is internal pre-compaction housekeeping
38. **Memory flush sentinel** — OpenClaw expects `NO_REPLY`, qwen3 outputs `NO`. Fixed by tuning thresholds.
39. **Per-model contextWindow** — lives at `models.providers.ollama.models[*].contextWindow`
40. **Ollama tray icon** — `ollama serve` does not show tray. Use `/api/tags` to verify.
41. **check_custom_model() gap** — verifies presence but NOT template correctness
42. **OpenClaw model entry requires `name` field** — omitting causes crash loop
43. **Gateway restart method** — `docker compose down` + `up -d` (restart has OCI namespace error)
44. **CXDB has no search** — retrieval by context ID and turn index only. Chroma needed for semantic search.
45. **Ollama context length slider** — check GUI settings. Default 4K may silently cap despite OpenClaw config.
46. **Ollama auto-download updates** — disable in GUI. May re-pull removed models.
47. **OpenClaw skill loading** — name + description in YAML frontmatter determines when skills activate. Bad descriptions = silent skills.
48. **OpenClaw injected files** — AGENTS.md, SOUL.md, TOOLS.md are the documented injected files. Other root .md files may also be injected.

---

## The ~2 Minute Delay Bug — Root Cause Analysis (Session 13)

Kept as institutional knowledge. This bug persisted across multiple architect sessions and was repeatedly misdiagnosed.

**Symptom:** ~2 minute delay between sending a message in ZuberiChat and receiving a response.

**Actual root cause:** OpenClaw's pre-compaction memory flush. A silent housekeeping run fires before the user's actual message. The model outputs "NO" instead of the expected `NO_REPLY` sentinel, so suppression fails. The housekeeping run blocks the real message for ~153 seconds because runs are serialized per session.

**Why it fired on every message:** `reserveTokensFloor` was 20,000 out of a 32,768 context window. Combined with `softThresholdTokens` of 4,000, the flush trigger was at only 8,768 tokens — exceeded by workspace .md files alone.

**Fix:** Tuned thresholds. Then upgraded to 131K context, making the flush trigger ~125,000 tokens (effectively never fires).

---

## ZuberiChat Render Bug — Technical Reference (Fixed ea3f94b)

Kept as institutional knowledge. Root cause: impure React state updater mutating refs inside `setMessages()`. React 19 StrictMode double-invokes updaters. Three bugs fixed: (A) impure updater moved outside setMessages, (B) `JSON.stringify(undefined).slice()` crash guarded, (C) heartbeat finals no longer clear streaming refs.

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

## RTL-058 Design — Discipline Routing Redesign + Self-Improving Feedback Loop
*Replaces RTL-053. Research complete. Phase 1 ready to implement after RTL-047 Phase 2.*

### Three-Phase Architecture

**Phase 1 — Static task-type routing rules (immediate)**

| Trigger | Discipline |
|---------|-----------|
| Image in request | Visual analysis (qwen3-vl:8b) |
| Tool calls needed (SearXNG, CXDB, email, Kanban, n8n) | General expertise (gpt-oss:20b) |
| Deep analytical synthesis, no tools | General expertise (gpt-oss:20b) + think: true |
| Code generation/debugging | Software engineering (qwen2.5-coder:14b) |
| General chat / fallback | General expertise (gpt-oss:20b) |

**Phase 2 — CXDB + Chroma feedback loop (bridge)**
After each task, Zuberi writes a routing outcome record to CXDB (audit log) and Chroma collection `router_records` (semantic index).

**Phase 3 — Autonomous self-improvement (long-term, RTL-016 territory)**
Query Chroma on low-confidence/ambiguous cases only. Periodic batch analysis. Human oversight hooks.

---

## RTL-047 Phase 2 Design — ToolApprovalCard UI

Card appears inline in message stream when `exec.approval.requested` fires. Shows tool/command being requested, which mode triggered it. Three buttons: Allow Once / Allow Always / Deny. 120s countdown timer. On expiry: auto-deny. On decision: card locks, sends `exec.approval.resolve` RPC.

---

## What To Do Next

No open P0s.

1. RTL-047 Phase 2 — ToolApprovalCard UI (design approved, backend wired)
2. RTL-058 Phase 1 — static discipline routing rules
3. Talk to Zuberi about real things — the infrastructure is largely complete

---
*This document replaces all prior handoff and RTL documents. Update it at the end of each working session.*
