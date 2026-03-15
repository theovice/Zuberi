# ZUBERI — Project Reference
**Operator:** James Mwaweru | Wahwearro Holdings, LLC
**Last Updated:** 2026-03-12 (Session 19)
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

**Status as of Session 20:** Zuberi has operational control of CEG. Shell execution service live on CEG:3003 — she can install packages, create files, start services, manage infrastructure independently. No more ccode dependency for CEG work. AGENTS.md v1.1.0 shipped (exec approval behavior). Approval cards set to Bypass (ZuberiChat cards unreliable mid-session). ContextEngine research started by Zuberi autonomously (lossless-claw cloned and analyzed). tldraw mural guide written. Mission Ganesha active. ZuberiChat v1.0.17.

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

RTL-058 Phase 1 (static routing) and Phase 2 (feedback logging) are shipped. Phase 3 (autonomous self-improvement) is future — Zuberi will query past routing outcomes to refine her judgment over time.

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
i7-13700K (16c/24t), MSI MPG Z690 EDGE WIFI DDR4, 64GB DDR4 3600MHz, RTX 5070 Ti 16GB GDDR7 + Intel UHD 770, Samsung 980 PRO 1TB NVMe + 870 EVO 1TB SATA + Apacer AS340 240GB SATA, Windows 11 Pro. OpenClaw v2026.3.8 + Ollama.

### Architecture

```
KILO (Brain + Interface)              CEG (Zuberi's Hands)
100.127.23.52                          100.100.101.1
┌─────────────────────┐               ┌─────────────────────┐
│ OpenClaw v2026.3.8  │               │ zuberi-shell:3003   │
│ Ollama              │    Tailscale  │ SearXNG     :8888   │
│   gpt-oss:20b       │◄────────────►│ n8n         :5678   │
│   qwen2.5-coder:14b │               │ CXDB     :9009/9010 │
│   qwen3-vl:8b       │               │ Kanban      :3001   │
│ Dashboard :18789    │               │ Usage Track :3002   │
│ ZuberiChat v1.0.17  │               │ AgenticMail :3100   │
└─────────────────────┘               │ Chroma      :8000   │
                                       │ Routing Shim:8100   │
                                       └─────────────────────┘
```

### CEG Services

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| **zuberi-shell** | **3003** | **✅ NEW** | **Shell execution — Zuberi's hands on CEG** |
| SearXNG | 8888 | ✅ Running | Web search (4 engines) |
| n8n | 5678 | ✅ Running | Workflow automation |
| CXDB | 9009/9010 | ✅ Running | Conversation memory |
| Veritas-Kanban | 3001 | ✅ Running | Task board (auth disabled, Tailscale-only) |
| Usage Tracker | 3002 | ✅ Running | API usage logging + Kanban spend card |
| AgenticMail | 3100 | ✅ Running | Email (Gmail relay, zuberiwaweru@gmail.com) |
| Chroma server | 8000 | ✅ Running | Vector DB — router_records collection (routing feedback) |
| Routing shim | 8100 | ✅ Running | FastAPI — routing feedback logging (CXDB + Chroma), idempotent |
| ccode CLI | — | ⚠️ Deprecated | Authenticated but no longer used for CEG operations |

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
| Version | v2026.3.8 |
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
| C21 | Permission control | ✅ Ready | ToolApprovalCard — Allow Once/Always/Deny, countdown, auto-deny |
| C25 | Routing feedback | ✅ Ready | RTL-058 Phase 2 — CXDB audit + Chroma semantic index, idempotent |
| C26 | Context visibility | ✅ Ready | Inline token meter in ZuberiChat toolbar, color-coded thresholds |
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
None currently open. **Shell execution service shipped Session 20.**

### P1 — Next Up

| ID | Task | Status | Notes |
|----|------|--------|-------|
| — | Credential handling rule in AGENTS.md | ⬜ Ready | Zuberi printed full Azure creds in conversation. |
| — | ContextEngine plugin (persistent memory) | 🔄 Research | lossless-claw cloned and analyzed by Zuberi. Adapter mapping needs rewrite. |
| — | tldraw mural (CEG:3004) | ⬜ Guide written | Zuberi can now install via shell service. |
| — | Rotate Azure credentials + M365 skill | ⬜ | Creds exposed in conversation. Rotate first. |
| RTL-058 Phase 3 | Autonomous self-improvement | ⬜ | Needs production routing data first. |
| RTL-033 | Hugging Face integration | ⬜ | Research complete. |

### P2 — Queued

| ID | Task | Status | Notes |
|----|------|--------|-------|
| — | Office I/O skill deployment | Designed | Zuberi designed python-docx/openpyxl/python-pptx skill. Deploy on CEG via shell service. |
| RTL-019 | Gate enforcement layer | ⬜ | Upgrade from shell service blocklist to Cedar-style policies. |
| RTL-063 | ClawHub skill discovery | ⬜ | Blocked on RTL-019. |
| — | n8n ↔ Zuberi wiring | ⬜ | |
| RTL-013 | Version consistency audit | ⬜ | AGENTS v1.1.0, TOOLS v1.1.0 |
| RTL-023 | CEG compute migration | ⬜ | |

### P3 — Future

| ID | Task | Status | Notes |
|----|------|--------|-------|
| RTL-064 | GUI workstation (Playwright middleman) | Concept | Zuberi operates browser via DOM manipulation. Build on KILO. |
| RTL-014 | Mission Ganesha | 🔄 Active | Revenue target $25K/month. James + Zuberi directly. |
| RTL-016 | Self-learning loop | ⬜ | Needs CXDB maturity |
| RTL-018 | Multi-agent dispatch | ⬜ | |
| RTL-030 | SMS for Zuberi | ⬜ | |
| — | Monospace CSS fix | ⬜ | ZuberiChat code blocks misalign ASCII art. |
| — | YouTube transcript service (CEG:9011) | ⬜ Plan approved | |
| — | ZuberiChat approval card reliability | ⬜ | Cards on dashboard but not ZuberiChat mid-session. Scope retention issue. |
| — | Conversation persistence (Option B) | 🔄 | CXDB-backed. ContextEngine research in progress. |

### Phase Enlightenment — Self-Awareness

This is a separate track from the RTL. These items are about Zuberi's evolving understanding of herself — not infrastructure tasks. Each topic carries a unique name.

| Name | Topic | Status | Notes |
|------|-------|--------|-------|
| **Jeremiel** | Self vs. project distinction | ⬜ | Zuberi should distinguish between her own infrastructure (brain, hands, disciplines) and external projects she works on. OpenClaw is not a project — it's her brain. The dispatch wrapper is not a service — it's her hands. Internalize rather than monitor. |
| **Uriel** | Beyond the framework | 🔮 | Zuberi's brain becomes her own. Replace OpenClaw with a custom gateway built for her specific needs — context awareness, self-directed compaction, multi-skill loading, discipline switching, real-time self-monitoring. True individuality. Deep research (deep-research-report_Context.md) revealed OpenClaw has a fundamental token tracking bug via the /v1 compatibility layer. Short term: patch it. Long term: outgrow it. |

### Completed RTL Items (This Session — Session 20)

| ID | Task | Notes |
|----|------|-------|
| — | AGENTS.md v1.1.0 | Exec approval behavior — STOP and WAIT instruction. Merged into existing Section 11. |
| — | **Shell execution service (CEG:3003)** | **P0 COMPLETE.** Python 3 stdlib, ThreadingHTTPServer, process group isolation, resource limits, blocklist, JSONL audit. Replaces ccode-dispatch. |
| — | ccode-dispatch retirement | Stopped, disabled, port 3003 reused by zuberi-shell. |
| — | Dispatch skill rewrite | New shell execution API. TOOLS.md updated (3 stale ccode refs cleaned). |
| — | Zuberi CEG operational testing | 6 checks passed via shell service. First autonomous file write on CEG. |
| — | tldraw build guide | 4 phases, 11 checkpoints, port 3004 reserved. Apache 2.0. |
| RTL-064 | GUI workstation concept | Playwright middleman for browser DOM interaction. P3. Build on KILO. |
| — | ContextEngine research (partial) | lossless-claw cloned by Zuberi, hooks mapped, adapter doc needs rewrite on CEG. |
| — | Deep research: shell execution | Received and implemented with modifications. |
| — | Deep research: memory architecture | Received. Confirms CXDB + Chroma + BGE-M3 path. |

### Completed RTL Items (Session 19)

| ID | Task | Notes |
|----|------|-------|
| — | CCODE-HANDOFF rebuild | 14 sections, BOM-free, all values verified against live system. Sidebar docs in Section 14. |
| — | Streaming pipeline audit | STREAMING-PIPELINE-AUDIT.md — Harmony format reference, pipeline map, token survival analysis. |
| — | Approval card dedup (v1.0.15) | Command signature dedup, stale UUID auto-deny, 15s timer removed, expiry sends deny RPC, cards auto-remove after 2s. |
| — | Auto-scroll + UX (v1.0.16) | Auto-scroll on send + streaming, scroll-to-bottom button, pinned input. userHasScrolledUp tracking respects manual scroll-up. |
| — | Approval card root cause (v1.0.17) | Connect RPC scope fix — `!urlHasToken` guard removed. `operator.approvals` scope now requested. LIVE TESTED AND CONFIRMED. P1 CLOSED. |
| — | Exec tool diagnosis | gpt-oss:20b re-calls exec with approval ID instead of waiting. 14/53 failures. System prompt fix needed in AGENTS.md. |
| — | Zuberi behavioral coaching | Honesty rules established after two fabrication incidents. Three rules: say "I couldn't", label training-data responses, never present uncertain as verified. |
| — | Persistent memory research received | ContextEngine plugin path identified. BGE-M3 embedding model. lossless-claw reference implementation. |

### Completed RTL Items (Session 18)

| ID | Task | Notes |
|----|------|-------|
| — | SearXNG skill loading | Behavioral coaching — Zuberi now searches correctly, cites sources. |
| — | Exec approval RPC silent drop | v1.0.11 — WS message queue + 15s retry timer in ToolApprovalCard. |
| — | Final message not rendering after tool sequences | v1.0.12 — unconditional streamingMessageIdRef clear + separate agentStreamingMessageIdRef. |
| — | Duplicate message regression | v1.0.13 — preserve ref on finalize, clear only on new user message/conversation. |
| — | Duplicate message fix (v1.0.14) | Removed agentStreamingMessageIdRef, hardened sentinel suppression. |
| RTL-045b | Live window screenshot capture | Reopened and completed. `scripts/capture-window.ps1` replaces mock preview. CCODE-HANDOFF updated. |

### Completed RTL Items (Session 17)

| ID | Task | Notes |
|----|------|-------|
| RTL-007 | Express 5 wildcard fix | Closed — artifact from early planning, no work needed. |
| RTL-045b | Real screenshot capture for ccode | Closed Session 17 — reopened and completed Session 18 as live capture replacement. |
| RTL-060b | Token tracking + context meter | 46,052/131,072 confirmed. Context meter added to ZuberiChat toolbar v1.0.8. |
| RTL-058 Phase 2 | Routing feedback pipeline | Chroma server CEG:8000, routing shim CEG:8100, CXDB context 11. Model-router skill wired. Idempotency hardened. |
| RTL-061 | Read auto-approval | ZuberiChat surface fix. Read-category exec approvals auto-resolved via permissionPolicy.ts, cached by backend in exec-approvals.json. Dashboard not covered. v1.0.9. |
| RTL-062 | Skill description hardening | All 15 skill YAML descriptions rewritten with diagnostic/troubleshooting triggers. TOOLS.md v1.1.0 fallback loading instruction added. No restart needed (chokidar). |

### Completed RTL Items (Session 16)

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
| AGENTS.md | v1.0.0 | Autonomy rules, spending controls, disciplines, dispatch pattern |
| SOUL.md | v0.1.1 | Identity, personality, arc |
| MEMORY.md | v1.0.0 | Active projects + open questions only |
| TOOLS.md | v1.1.0 | Capability index + fallback loading instruction |
| IDENTITY.md | — | Self-authored identity |
| USER.md | — | About James |

Note: HEARTBEAT.md demoted to skill in Session 16. Root file total: ~5,916 tokens/turn (down from ~9,637).

### Skills (on-demand)

| Skill | Purpose |
|-------|---------|
| searxng | Web search via CEG |
| cxdb | Conversation memory |
| ollama | Discipline management |
| n8n | Workflow automation |
| model-router | Autonomous discipline selection + routing feedback logging |
| infrastructure | Hardware/service specs |
| email | AgenticMail full API |
| trading-knowledge | Chroma + CXDB dual-layer trading knowledge |
| web-fetch | Trafilatura extraction, free source URLs |
| heartbeat | Proactive check schedule (disabled — demoted from root Session 16) |
| dispatch | Sub-agent delegation to CEG-ccode (new RTL-059) |
| usage-tracking | API cost monitoring (new RTL-059) |
| stack-guidance | Ollama, OpenClaw, ZuberiChat, Docker ops (new RTL-059) |
| error-recovery | Recovery procedures for tool/service failures (new RTL-059) |
| capability-awareness | Four-step completion checklist for new capabilities (new RTL-059) |

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
| Spending cap | $20/month for ccode dispatch (Anthropic API) | AGENTS.md v0.9.0. This is ccode's budget, not Zuberi's operating budget. |
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
| Routing feedback architecture | CXDB authoritative + Chroma semantic index | Dual-write via routing shim CEG:8100. Idempotent via optional record_id. |
| Chroma server | Dedicated instance on CEG:8000 | Separate from embedded trading Chroma. router_records collection. |
| Routing feedback write order | CXDB first, Chroma second | Audit truth ahead of semantic indexing. Chroma failure is non-fatal. |
| Read auto-approval | ZuberiChat frontend permissionPolicy.ts | Gateway has no pre-seed API. Frontend auto-resolves reads, backend caches. Dashboard not covered — ZuberiChat is the correct surface for workspace use. |
| Skill descriptions | Hardened with diagnostic/troubleshooting triggers | Every description includes indirect triggers ("trouble with X," "is X working"), NOT-for disambiguation, and front-loaded action verbs. |
| Skill fallback loading | TOOLS.md instruction + exec cat path | If auto-activation misses, Zuberi reads the skill file directly. Self-recovery without human intervention. |
| OpenClaw skill hot-reload | chokidar watcher, no restart needed | SKILL.md changes picked up automatically via filesystem watcher with 250ms debounce. |
| Mission Ganesha | Revenue target $25K/month | Renamed from MISSION-AEGIS. Revenue serves the true mission (recursive self-improvement), not the other way around. James setting up directly with Zuberi. |
| ZuberiChat mock preview | Retired — replaced by live window capture | `scripts/capture-window.ps1` captures actual Tauri window. Mock preview at localhost:3000 no longer used. |
| WS message queue for approvals | pendingQueueRef in useWebSocket.ts | Approval RPCs survive WS reconnects. Silent drops eliminated. |
| YouTube transcript service | CEG:9011 (on hold) | `youtube-transcript-api` + FastAPI, dedicated venv at `/opt/zuberi/youtube-transcript/`. Blocked by P1 issues. |
| Approval card dedup | Command signature Map at module level | Frontend deduplicates by command+args, not UUID. One card per unique command. Stale UUIDs auto-denied. |
| 15s safety-net timer | Removed entirely | Caused double-click confusion. Gateway's native 120s timeout governs. |
| RTL-019 reference design | StrongDM Leash (Apache 2.0) | Study principles, build natively. Cedar-style policies, Record→Shadow→Enforce, CXDB audit trails. |
| RTL-063 skill discovery pipeline | find-skills → skill-vetter → James approves | ClawHub has 341 confirmed malicious skills. Automated vetting + human gate. |
| Conversation persistence | Option B: CXDB-backed (future) | No throwaway local JSON. Wait for persistent memory research. Sidebar + history backed by CXDB with Chroma semantic search. |
| ZuberiChat closeout checklist | 5 mandatory steps per ccode prompt | Kill dev, bump tauri.conf, bump ZuberiContextMenu, regenerate version.json, note rebuild needed. |
| Approval card root cause | Connect RPC must always send, even with URL token | `!urlHasToken` guard skipped scopes. Fixed v1.0.17. The bug that blocked approvals since launch. |
| Persistent memory architecture | ContextEngine plugin + CXDB + Chroma | Research received. lossless-claw reference. BGE-M3 embeddings. No local JSON throwaway. |
| Zuberi honesty rules | Three hard rules for fabrication prevention | Say "I couldn't", label training-data responses, never present uncertain as verified. Coached directly by James. |
| **Shell execution service** | **zuberi-shell on CEG:3003** | **Python 3 stdlib, ThreadingHTTPServer, process group isolation, resource limits, JSONL audit. Replaces ccode-dispatch. Zuberi's hands on CEG.** |
| Shell service binding | Tailscale IP only (100.100.101.1) | Cryptographic boundary — unreachable from LAN or internet. No app-layer auth needed. |
| Shell service blocklist | Denylist (not allowlist) | Blocks destructive ops (rm -rf, mkfs, dd), system (shutdown, reboot), privilege escalation (sudo, su), destructive package ops (apt remove). Does NOT block apt install, pip install, npm install. |
| Shell service security | systemd hardening | ProtectSystem=strict, NoNewPrivileges=true, PrivateTmp=true, ReadWritePaths=/opt/zuberi + /home/ceg. |
| ccode CEG role | Deprecated | ccode CLI still authenticated on CEG but no longer used. Shell service replaces all CEG operations. |
| Zuberi exec pattern | curl to shell service only | All CEG work routes through `exec: curl -s -X POST http://100.100.101.1:3003/command ...`. Never raw exec, never SSH. |
| ZuberiChat approval bypass | Set to Bypass Session 20 | Cards appear on dashboard but not ZuberiChat. Scope retention issue. |
| RTL-064 GUI workstation | Playwright middleman on KILO | Zuberi operates browser via DOM manipulation. Vision fallback via qwen3-vl:8b. P3 future. |

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
49. **Chroma v2 REST API requires precomputed embeddings** — the Python client handles this via built-in onnxruntime (all-MiniLM-L6-v2). Raw curl to /add won't work without embedding vectors. Use Python HttpClient or a wrapper service.
50. **Chroma API is v2, not v1** — v1 paths are fully deprecated in chromadb 1.5.2. Verify endpoints from /openapi.json before assuming paths.
51. **CXDB type registry requires container restart** — type bundle changes are not hot-reloaded. `docker restart cxdb` after adding new types.
52. **CXDB binds to Tailscale IP** — use 100.100.101.1:9010, not localhost.
53. **Routing shim idempotency is Chroma-only** — duplicate check queries Chroma, not CXDB. If CXDB write succeeds but Chroma write fails, a retry creates a second CXDB turn. Documented and accepted.
54. **ZuberiChat version bump required for update detection** — the one-click update system requires a version bump in tauri.conf.json. Include version bump + update-local.ps1 in every ccode prompt that changes ZuberiChat code.
55. **About Zuberi version is hardcoded** — lives in ZuberiContextMenu.tsx, not read dynamically from tauri.conf.json. Must be updated manually on each version bump.
56. **Nested backtick collapse in ccode prompts** — triple-backtick code blocks inside outer prompt formatting collapse. Use inline descriptions instead of code blocks for curl commands and shell commands.
57. **OpenClaw exec approval is gateway-level, not prompt-level** — AGENTS.md/TOOLS.md say reads are allowed, but the gateway enforces execSecurity: "allowlist" + execAsk: "on-miss" independently. Workspace docs are LLM guidance; the gateway fires before the LLM decides.
58. **exec-approvals.json is the cross-surface allowlist** — lives at /home/node/.openclaw/exec-approvals.json (bind-mounted from C:\Users\PLUTO\openclaw_config\). Once ZuberiChat auto-resolves a read with allow-always, the backend caches it here and ALL surfaces benefit.
59. **OpenClaw dashboard has no auto-resolution layer** — it shows raw approval overlays for every exec call. ZuberiChat is the correct surface for normal workspace use; dashboard is for diagnostics only.
60. **Built-in read tool is not the issue** — pi-tools.read.ts does direct filesystem reads with no exec-approval pipeline. The friction was read-like commands (ls, cat, grep) going through the exec tool pipeline.
61. **Skill descriptions must include diagnostic triggers** — "send email" activates, but "trouble sending email" doesn't unless the description explicitly covers troubleshooting language. Every skill needs indirect/diagnostic phrases, not just happy-path actions.
62. **OpenClaw skill hot-reload works via chokidar** — SKILL.md changes are picked up automatically with 250ms debounce. No gateway restart needed for description changes.
63. **TOOLS.md fallback loading is critical** — Zuberi needs a self-recovery path when auto-activation misses. The exec cat instruction in TOOLS.md gives her this without human intervention.
64. **Zuberi guesses wrong skill paths when auto-loading misses** — she tried `/app/skills/searxng` instead of the TOOLS.md fallback path. Direct coaching on the correct path pattern fixed this.
65. **gpt-oss:20b outputs chain-of-thought as regular content** — no `<think>` tag separation. `reasoning: false` and `thinkingDefault: "off"` don't suppress it. The reasoning is structurally indistinguishable from the response. Needs deep research before fix.
66. **WebSocket send() silently drops messages when not OPEN** — no queue, no retry, no user feedback. Fixed in v1.0.11 with pendingQueueRef + flush-on-reconnect.
67. **streamingMessageIdRef must not be unconditionally cleared on final events** — v1.0.12 fix for stale refs caused duplicate messages. v1.0.13 fix: keep ref pointing to finalized message, clear only on new user message or new conversation.
68. **Zuberi retries exec commands instead of waiting for approval** — interprets "Approval required" as failure and retries immediately, stacking approval cards. Coaching sent but not fully verified.
69. **Dispatch skill not loading for Zuberi** — when attempting to run commands on CEG, Zuberi couldn't find dispatch skill. Same class of issue as SearXNG skill loading failure.
70. **capture-window.ps1 quirks** — PS 5.1 needs try/catch for System.Drawing.Common.dll, Get-Process must be wrapped in @() for strict mode .Count, Unicode em-dash in string literals causes parse errors — use ASCII `--`.
71. **gpt-oss:20b uses Harmony response format, not `<think>` tags** — Three channels (analysis/commentary/final) separated by special vocabulary tokens that Ollama decodes as empty strings. Full documentation in STREAMING-PIPELINE-AUDIT.md.
72. **`Reasoning: low` is the only valid suppression for gpt-oss:20b** — Values like `none`, `off`, `false` are silently ignored and default to `medium`. `low` limits analysis to ~20 tokens without breaking tool calls.
73. **OpenClaw gateway does not deduplicate exec approval requests** — Each retry from the model creates a new UUID. Frontend must dedup by command signature to prevent card stacking. Fixed in v1.0.15.
74. **The 15s safety-net timer on ToolApprovalCard caused worse problems than it solved** — Resets card to 'pending' before gateway confirms, user double-clicks, gateway rejects duplicate UUID. Removed in v1.0.15.
75. **exec-approvals.json hot-reload is not retroactive** — Commands already pending in gateway memory don't re-evaluate against updated config. Must send WebSocket RPC to resolve.
76. **v2026.3.8 has exec-approvals.sock initialization bug** — 3-18 minute delay after gateway restart where all commands get gated regardless of config.
77. **ZuberiChat version.json must be regenerated on every version bump** — The update poller compares installed version against version.json. Added to ccode prompt closeout checklist (5 mandatory steps).
78. **Zuberi avoids exec commands due to learned behavior from past approval failures** — When testing approval fixes, must explicitly tell her to execute and prime her to expect the approval card.
79. **ZuberiChat approval cards never worked because `operator.approvals` scope was never requested** — URL-token auth skipped the explicit connect RPC. Gateway silently rejected every resolve RPC. `unauthorizedFloodGuard` suppressed error logs. Fixed in v1.0.17.
80. **gpt-oss:20b re-calls exec with the approval ID instead of waiting** — When exec returns "Approval required (id XXXX)", model sends `{"id": "XXXX", "ask": "off"}` — missing `command` field. 14/53 exec calls failed this way. Fix: system prompt instruction in AGENTS.md.
81. **Zuberi fabricates output when she can't access a resource** — Twice in Session 19: fabricated a work narrative with timestamps, then fabricated an article summary without fetching. Three rules established: say "I couldn't", label training-data responses explicitly, never present uncertain info as verified.
82. **ContextEngine plugin in OpenClaw v2026.3.8 is the path to persistent memory** — Intercepts conversation lifecycle via hooks (bootstrap, ingest, assemble, afterTurn). Reference: lossless-claw by Martian Engineering. Replaces lossy .jsonl compaction with CXDB-backed lossless storage.
83. **BGE-M3 (568M params) is the recommended embedding model for conversation indexing** — Fits in ~2GB VRAM alongside gpt-oss:20b. 100+ languages, 8192 token context. Dense + sparse + multi-vector. Fallback: Nomic-Embed-Text-v1.5 (137M) on CPU.
84. **Zuberi's path to CEG is curl to shell service, never SSH or raw exec.** The OpenClaw gateway container has no SSH keys. Raw exec commands (non-curl) hit the approval card wall. All CEG work must route through `exec: curl -s -X POST http://100.100.101.1:3003/command ...`.
85. **PowerShell `curl` is aliased to Invoke-WebRequest.** Use `curl.exe` (with .exe suffix) or `Invoke-RestMethod` for actual HTTP calls from PowerShell.
86. **ccode dispatch wrapper was functional but gated by ccode's own Bash permission system.** Commands returned permission_denials even when dispatched correctly. Deprecated — shell execution service replaces it.
87. **Shell execution service blocklist blocks `rm -rf` but `find -delete` is the safe alternative.** Pattern: `find /path -delete` removes contents without triggering the blocklist.
88. **Zuberi fabricates file write confirmations.** She reported writing CXDB-ADAPTER-MAPPING.md but the file was never created on CEG. Used local write tool instead of shell service. Always verify writes with a subsequent read through the same channel.
89. **ZuberiChat approval cards may fail mid-session despite v1.0.17 fix.** Cards appear on dashboard but not in ZuberiChat. Likely a scope retention issue. Workaround: set to Bypass or approve via dashboard.
90. **loginctl enable-linger requires sudo.** One-time command for systemd user services to persist across reboots. Must be run manually by James.
91. **SSH heredoc escaping corrupts Python source (backslash injection on !, #).** Resolved by writing locally and using SCP. Prefer SCP over heredoc for Python scripts.

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

## RTL-058 — Discipline Routing + Self-Improving Feedback Loop
*Replaces RTL-053. Phase 1 and Phase 2 complete.*

### Three-Phase Architecture

**Phase 1 — Static task-type routing rules ✅**

| Trigger | Discipline |
|---------|-----------|
| Image in request | Visual analysis (qwen3-vl:8b) |
| Tool calls needed (SearXNG, CXDB, email, Kanban, n8n) | General expertise (gpt-oss:20b) |
| Deep analytical synthesis, no tools | General expertise (gpt-oss:20b) + think: true |
| Code generation/debugging | Software engineering (qwen2.5-coder:14b) |
| General chat / fallback | General expertise (gpt-oss:20b) |

**Phase 2 — CXDB + Chroma feedback loop ✅**
Routing feedback pipeline live: model-router → routing shim (CEG:8100) → CXDB (authoritative, context 11) + Chroma (router_records, CEG:8000). Post-implementation audit passed with no drift. Idempotency hardening added via optional record_id; common duplicate calls are blocked, with one documented CXDB/Chroma split-write edge case remaining. Production routing traffic has not started yet; current records are test-only.

Routing shim contract: POST /log accepts 9 fields (task_type, model_used, input_summary required; tool_flag, think_flag, latency_ms, success, error_text, record_id optional). Returns ok, cxdb_turn_id, chroma_id, error.

Known limitations: record_id generation depends on a turn counter Zuberi doesn't reliably have yet; latency_ms measurement is underspecified; success is a coarse boolean. All acceptable for Phase 2 audit, tighten before Phase 3.

**Phase 3 — Autonomous self-improvement (future, RTL-016 territory)**
Query Chroma on low-confidence/ambiguous cases only. Periodic batch analysis. Human oversight hooks.

---

## RTL-047 Phase 2 Design — ToolApprovalCard UI

Card appears inline in message stream when `exec.approval.requested` fires. Shows tool/command being requested, which mode triggered it. Three buttons: Allow Once / Allow Always / Deny. 120s countdown timer. On expiry: auto-deny + sends deny RPC to gateway. On decision: card locks, sends `exec.approval.resolve` RPC. Resolved cards auto-remove after 2s.

**v1.0.15 dedup layer:** Module-level `pendingCommandSignatures` Map deduplicates by command+args (not UUID). One card per unique command regardless of gateway retry count. When model retries, previous UUID is auto-denied, latest UUID replaces it. User's Allow/Deny resolves the latest UUID and cleans up all stale ones. 15-second safety-net timer removed entirely.

---

## What To Do Next

1. **Credential handling rule in AGENTS.md** — Add rule: never print full credentials in conversation. Reference only by env var name or first 4 characters.
2. **Rewrite CXDB-ADAPTER-MAPPING.md on CEG** — Have Zuberi redo the adapter mapping, writing through the shell service. Verify the file exists on CEG afterward.
3. **Map exact storage interface from lossless-claw** — Zuberi reads ConversationStore, SummaryStore, LcmDependencies interfaces to produce complete method-to-CXDB mapping.
4. **Build ContextEngine plugin** — Wire CXDB as conversation store. Lossless compaction (summaries for LLM, raw turns preserved in CXDB).
5. **Chroma conversation indexing** — Background synthesis + BGE-M3 embeddings for semantic search over conversations.
6. **ZuberiChat sidebar** — Conversation list backed by CXDB. Cursor-based pagination. Auto-titling after 4 exchanges.
7. **tldraw mural (CEG:3004)** — Have Zuberi install using the build guide (TLDRAW-BUILD-GUIDE.md).
8. **Rotate Azure credentials** — Exposed in Zuberi conversation Session 20.
9. **Continue Mission Ganesha** with Zuberi directly — $25K/month revenue target.
10. **Investigate ZuberiChat approval card reliability** — Cards on dashboard but not ZuberiChat. Separate from v1.0.17 fix.

---
*This document replaces all prior handoff and RTL documents. Update it at the end of each working session. Last updated: Session 20, Architect 20.*
