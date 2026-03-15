# RTL.md — Roadmap to Live
# Operator: James Mwaweru | Wahwearro Holdings, LLC
# Version: 0.4.0 | 2026-03-01
#
# PURPOSE: Single source of truth for what's done, what's next, and what's
# blocked on the path to making Zuberi fully operational. Merges the execution
# roadmap (infrastructure phases) with the capability inventory (what Zuberi
# gains at each phase) and solution details (how each capability gets unlocked).
#
# Replaces: FTAE.md (retired), VISION-TOOL-DESIGN.md (folded in)
# Lives alongside: conversation-handoff.md (operating agreement), INFRASTRUCTURE.md
#
# UPDATE THIS FILE when:
#   - A phase step is completed
#   - A capability status changes
#   - A new capability is identified
#   - A solution decision is made or changed
#   - Hardware or infrastructure state changes

---

## Maturity Scale

| Level | Symbol | Meaning |
|-------|--------|---------|
| Ready | ✅ | Zuberi can do this today |
| Partial | 🟡 | Can start but will hit limits or need human help |
| Blocked | ❌ | Missing capability or config prevents this |
| Done | ✔ | Phase step completed |

---

## Capability Inventory

| ID | Capability | Status | Has Today | Unlocked In |
|----|-----------|--------|-----------|-------------|
| C1 | Long-form writing & reasoning | ✅ | qwen3:14b-fast (primary), qwen3:14b available for deep reasoning | Phase 1 |
| C2 | File read/write | ✅ | OpenClaw tools: read, write, edit, apply_patch | Phase 1 |
| C3 | Local code execution | ✅ | OpenClaw exec tool, sandbox mode=all | Phase 1 |
| C4 | Web search | 🟡 | SearXNG on CEG (8888), skill deployed, end-to-end test pending | Phase 3 → 3A |
| C5 | Package install / build tools | ❌ | Sandbox network=none | Phase 2B |
| C6 | Multi-agent coordination | 🟡 | CEG-ccode architecture decided, CEG online | Phase 3 |
| C7 | Workflow automation (n8n) | 🟡 | n8n on CEG (5678), running, not wired to Zuberi | Phase 3A |
| C8 | Structured data output (xlsx) | 🟡 | csv/json yes, xlsx no | Phase 2B |
| C9 | Database access | 🟡 | CXDB on CEG (9009/9010), skill deployed, type descriptors registered | Phase 3 → 3A |
| C10 | Stronger reasoning model | 🟡 | qwen3:14b capable but capped | Phase 3 (via ccode) / Phase 5 (GPU) |
| C11 | Persistent memory | 🟡 | memoryFlush + memorySearch configured, hybrid search + cache tuned | Phase 1 |
| C12 | External API integrations | ❌ | No outbound API access | Phase 2D |
| C13 | Image/diagram generation | ❌ | No image model | Phase 2B (diagrams) / Phase 5 (full) |
| C14 | Browser interaction / scraping | ❌ | Browser tool denied | Phase 2C |
| C15 | Document generation (pdf/docx) | 🟡 | Markdown/html only | Phase 2B |
| C16 | Coding sub-agent (ccode) | 🟡 | Architecture decided, CEG online, headless auth TBD | Phase 3 |
| C17 | Vision / multimodal understanding | 🟡 | qwen3-vl:8b pulled, skill not built | Phase 2B |

---

## Phase Overview

```
Phase 1   ████████████████████  KILO Baseline — DONE
Phase 1A  ████████████████████  KILO Housekeeping — DONE (GPU upgraded to RTX 5070 Ti)
Phase 2A  ════════════════════  Superseded by Phase 3 (SearXNG on CEG)
Phase 2B  ░░░░░░░░░░░░░░░░░░░░  Custom Sandbox + Vision — READY NOW
Phase 2C  ░░░░░░░░░░░░░░░░░░░░  Browser + SQLite — READY NOW
Phase 2D  ░░░░░░░░░░░░░░░░░░░░  External API Access — NEEDS DECISION
Phase 3   ████████████████████  CEG Online + Services — DONE (security hardened)
Phase 3A  ██████████████░░░░░░  Integration + Wiring — IN PROGRESS (app complete, security done, skills need triggering fix, n8n wiring next)
Phase 4   ░░░░░░░░░░░░░░░░░░░░  Mission Launch — AFTER PHASE 3A
Phase 5   ░░░░░░░░░░░░░░░░░░░░  Zuberi Home Build — FUTURE
```

---

## Project Execution Path

Every project Zuberi runs follows this sequence:

```
RESEARCH → STRATEGY → MODEL → DESIGN → BUILD → AUTOMATE
  C4,C14     C1,C11    C1,C3    C1,C2    C2,C3    C7,C9
  C17                   C8,C5    C3       C5,C12   C12,C14
                                 C17      C16
```

### Current Readiness by Stage

| Stage | Status | Blocker | Unlocked By |
|-------|--------|---------|-------------|
| Research | 🟡 Partial | SearXNG skill deployed, end-to-end test pending. No browser (C14). | Live test → Phase 2C (browser) for ✅ |
| Strategy | ✅ Ready | Quality limited without research inputs | Improves with Research unlock |
| Financial Model | 🟡 Partial | No xlsx output (C8), no tooling (C5) | Phase 2B (custom sandbox) |
| Design | ✅ Ready | Diagram rendering nice-to-have (C13) | Phase 2B (Mermaid CLI) |
| Build | ❌ Blocked | No packages (C5), no APIs (C12), ccode sub-agent not auth'd (C16) | Phase 2B + 2D + 3A |
| Automate | 🟡 Partial | n8n running but not wired (C7), CXDB skill deployed but untested (C9) | Phase 3A completion |

---

## Phase 1: KILO Baseline — DONE

**Capabilities delivered:** C1, C2, C3, C11 (partial)

| Step | Status |
|------|--------|
| Ollama installed, qwen3:14b-fast active (4 models available) | ✔ |
| OpenClaw Docker deployed, dashboard at localhost:18789 | ✔ |
| 7 identity .md files in openclaw_workspace | ✔ |
| ZuberiChat app v0.1.0 installed via MSI | ✔ |
| memoryFlush + memorySearch configured | ✔ |
| Sandbox: mode=all, scope=agent, network=none | ✔ |

---

## Phase 1A: KILO Housekeeping — NEARLY DONE

Cleanup and prep tasks on KILO before pushing forward.

| Step | Status | Notes |
|------|--------|-------|
| GPU fix — gpt-oss:20b suspected CPU fallback | ✔ | GPU upgraded to RTX 5070 Ti 16GB GDDR7. gpt-oss:20b still CPU/GPU split (13.8GB > 16GB) |
| Deploy workspace .md files to OpenClaw | ✔ | 9 .md files confirmed in workspace + 2 skills |
| Memory config merge into openclaw.json | ✔ | Hybrid search + cache applied, validated |
| Ollama models moved to E:\ollama\models | ✔ | OLLAMA_MODELS env var set (user-level) |
| qwen3-vl:8b pulled | ✔ | 5.72 GB on E:\ |
| C:\ cleaned (+123GB free, now 328GB) | ✔ | BlueStacks, FiveM, Soulframe removed |
| ccode re-authenticated | ✔ | v2.1.59 active |
| IDENTITY.md + USER.md populated | ✔ | Ccode filled from lived experience |

**Remaining:** None. Phase 1A complete.

---

## Phase 2A: Web Search — SUPERSEDED BY PHASE 3

**Original plan:** Deploy SearXNG on KILO.
**What happened:** SearXNG deployed on CEG instead (Phase 3). Integration via OpenClaw workspace skill, not openclaw.json config.

**Capabilities unlocked:** C4 (web search) — via Phase 3 + 3A path
**Stages improved:** Research ❌→🟡 (pending live test)

Phase 2A's goals are now met by Phase 3 (SearXNG on CEG) + Phase 3A (skill wiring).
The solution options and design notes below remain valid reference.

### Solution options (C4 — Web Search)

**Option A: SearXNG (self-hosted, recommended) — CHOSEN**
- Running on CEG at 100.100.101.1:8888 (Tailscale only)
- JSON API enabled, limiter disabled
- OpenClaw workspace skill at skills/searxng/SKILL.md
- Gateway-level exec (elevated config) bypasses sandbox network=none
- Zero API keys, zero cost, fully local/private
- **Privacy: ✅ All queries stay on the tailnet**

**Option B: Brave Search API (free tier)**
- 2,000 searches/month free, no credit card needed
- OpenClaw's default recommended provider
- **Privacy: 🟡 Queries go to Brave's servers**

**Option C: Perplexity Sonar via OpenRouter**
- AI-synthesized answers with citations from real-time search
- Requires OpenRouter account
- **Privacy: 🟡 Queries go to OpenRouter + Perplexity**

**Note:** Web search via gateway-level exec does NOT require sandbox network changes. The elevated config allows exec from webchat at gateway level (host network), which has Tailscale access to CEG.

---

## Phase 2B: Custom Sandbox Image + Vision — NO HARDWARE CHANGES NEEDED

**Capabilities unlocked:** C5 (package install), C8 (xlsx), C13 (diagrams), C15 (pdf/docx), C17 (vision skill)
**Stages improved:** Financial Model 🟡→✅, Design → ✅ (rendered diagrams), Research gains vision

### What to do (custom sandbox image)

1. Create `Dockerfile.zuberi-sandbox` based on `openclaw-sandbox:bookworm-slim`
2. Install: Node.js, Python 3, pip, pnpm, git, curl, jq
3. Install Python libs: openpyxl, reportlab, python-docx, matplotlib, pandas
4. Install diagram tools: `mmdc` (Mermaid CLI)
5. Install OpenCV (for video keyframe extraction)
6. Build: `docker build -t zuberi-sandbox:latest -f Dockerfile.zuberi-sandbox .`
7. Update `openclaw.json`: `agents.defaults.sandbox.docker.image: "zuberi-sandbox:latest"`
8. Restart OpenClaw gateway

### What to do (vision skill — C17)

9. Build OpenClaw gateway-level skill wrapping Ollama vision API
10. Test: send a screenshot, verify structured output
11. Test video workaround: keyframe extraction + batch vision

### Trigger conditions
- [x] No hardware needed
- [x] qwen3-vl:8b already pulled
- [x] No sandbox network change at runtime (everything pre-installed)
- [ ] James approves custom image approach
- [ ] OpenClaw skill authoring pattern researched

### Solution options (C5 — Package Install)

**Option A: Custom sandbox image (recommended)**
- Bake a custom Docker image with common toolchains pre-installed
- Include: Node.js, Python 3, pip, pnpm, git, curl, jq, openpyxl, reportlab, python-docx
- Build once, use forever. No network needed at runtime.
- Config: `agents.defaults.sandbox.docker.image: "zuberi-sandbox:latest"`

**Option B: setupCommand with temporary egress**
- Set `sandbox.docker.network: "bridge"`
- Add setupCommand to install packages on container creation
- Requires `readOnlyRoot: false` and `user: "0:0"` (root)
- **Risk: Container has network access during setup.**

**Option C: Controlled egress via Docker network + proxy**
- Squid proxy with domain allowlist (npmjs.org, pypi.org, github.com)
- Most secure for ongoing network access, but more complex

**Recommendation:** Option A (custom image). No runtime network, no security tradeoff.

### Vision Tool Design (C17)

**Model:** qwen3-vl:8b via Ollama on KILO
**Approach:** Gateway-level OpenClaw skill (direct Ollama API call)
**GPU:** KILO RTX 3060 12GB — shared with active model, Ollama swaps as needed

**Architecture:**
```
Zuberi (qwen3:14b-fast) — reasoning, planning, orchestration
  │
  ├── needs vision? ──→ gateway-level vision skill
  │                       │
  │                       ├── encodes image as base64
  │                       ├── POST to Ollama API (qwen3-vl:8b)
  │                       ├── Ollama swaps models on GPU (~5-10s)
  │                       └── returns text/JSON result
  │
  └── continues reasoning with vision output as context
```

Both models run on KILO's RTX 3060 12GB — one at a time, Ollama manages swapping.
No second GPU needed. No CEG dependency.

**What qwen3-vl:8b provides:**
- OCR (32 languages, low-light/blurred/tilted images)
- Scene description and object recognition
- Chart/table parsing to structured JSON
- UI element recognition (buttons, forms, layouts)
- Document understanding (invoices, forms, screenshots)
- Frame-by-frame video analysis (with keyframe extraction)

**What it does NOT provide (yet):**
- Direct video input (Ollama doesn't support it — issue #12926)
- Simultaneous reasoning + vision (one model at a time on 12GB)
- Real-time video streaming analysis

**Video workaround:** Extract keyframes using OpenCV (1 frame per 2-3 seconds),
send frames as images to qwen3-vl:8b. Zuberi (qwen3:14b-fast) synthesizes the
frame descriptions into coherent understanding.

**Ollama API call pattern:**
```bash
curl http://localhost:11434/api/chat \
  -d '{
    "model": "qwen3-vl:8b",
    "messages": [{
      "role": "user",
      "content": "Extract all text visible in this screenshot. Return as JSON.",
      "images": ["<base64-encoded-image>"]
    }],
    "stream": false
  }'
```

**Skill behavior:**
1. Accept: image file path (in workspace) + analysis prompt
2. Read image file, base64-encode it
3. POST to Ollama API at localhost:11434 with qwen3-vl:8b
4. Return the model's text response to the agent session

**Video analysis pattern:**
```
Video file → OpenCV keyframe extraction (1 per 2-3 sec)
  → Keyframes saved as workspace/working/frames/frame_001.jpg
  → Vision skill called in batch (keeps qwen3-vl:8b loaded)
  → Results aggregated into structured JSON
  → Zuberi (qwen3:14b-fast) synthesizes sequence understanding
```

**What this replaces from Infinet's pipeline:**

| Infinet Component | Replaced By |
|---|---|
| OpenCV frame extraction | Still needed for video (temporary) |
| Tesseract OCR | qwen3-vl:8b native OCR (32 languages) |
| YOLO object detection | qwen3-vl:8b scene understanding |
| CLIP scene classification | qwen3-vl:8b image description |
| LSTM temporal reasoning | Zuberi (qwen3:14b-fast) synthesizes frame sequence |
| T5 fine-tuning | Not needed — structured extraction to JSON knowledge base |

6 tools → 2 models (brain + eyes) + OpenCV. On Zuberi Home: 1 model (Qwen3.5) + OpenCV.

---

## Phase 2C: Browser + Database — MINOR CONFIG CHANGES

**Capabilities unlocked:** C14 (browser), C9 (database via SQLite)
**Stages improved:** Research 🟡→✅, Build → 🟡 (can prototype with SQLite)

### What to do (browser)

1. Build sandbox browser image: `scripts/sandbox-browser-setup.sh`
2. Add `browser` to tool allowlist in `openclaw.json`
3. Configure `sandbox.browser` with allowlists for approved domains
4. Test with a harmless site first

### What to do (database)

5. Create SQLite database in workspace: `openclaw_workspace/data/zuberi.db`
6. Bind-mount into sandbox container via sandbox config
7. Zuberi uses Python `sqlite3` module (already in standard library)

### Trigger conditions
- [ ] James approves browser tool enablement
- [ ] James defines domain allowlist for browser access
- [ ] James approves SQLite as interim database

### Solution options (C14 — Browser)

**Option A: OpenClaw sandboxed browser (recommended)**
- Built-in sandboxed browser support in OpenClaw
- Runs headless browser in a dedicated Docker container
- Config: enable `browser` in tool allowlist, configure `sandbox.browser`
- noVNC observer for James to watch
- Can restrict via `allowedControlUrls` and `allowedControlHosts`
- **Security: ✅ Isolated container, observable, restrictable**

**Option B: Firecrawl CLI skill**
- Handles JS-heavy sites, bot protection, interactive automation
- Runs on Firecrawl's infrastructure — no local Chromium
- Requires Firecrawl API key (free tier available)
- **Privacy: 🟡 Content goes through Firecrawl's servers**

**Recommendation:** Option A. Local, sandboxed, observable.

### Solution options (C9 — Database)

**Option A: SQLite on KILO (immediate, lightweight)**
- No server — just a file. Python built-in `sqlite3`.
- Store in workspace: `openclaw_workspace/data/zuberi.db`
- Works inside sandbox if file is bind-mounted.

**Option B: CXDB on CEG (Phase 3) — DEPLOYED**
- Running on CEG at 100.100.101.1:9009/9010 (Tailscale only)
- Type descriptors registered (bundle zuberi-2026-02-28)
- Workspace skill deployed at skills/cxdb/SKILL.md
- End-to-end test pending from Zuberi webchat

**Option C: PostgreSQL container on KILO (intermediate)**
- Docker container alongside OpenClaw. More capable than SQLite.

**Recommendation:** CXDB (Option B) is live. SQLite (Option A) still useful for sandbox-local work.

---

## Phase 2D: External API Access — REQUIRES DECISION

**Capabilities unlocked:** C12 (external APIs)
**Stages improved:** Build → ✅ (full stack with API integrations)

### What to do

1. Decide network approach: gateway proxy vs. sandbox egress vs. n8n middleware
2. Define API key storage strategy
3. Define which external services Zuberi can call
4. Implement chosen approach
5. Test with a low-risk public API first

### Trigger conditions
- [ ] James makes network/security decision
- [ ] API key management strategy defined
- [ ] Phases 2A-2C stable

### Solution options (C12 — External APIs)

**Option A: Gateway-level API proxy (recommended)**
- OpenClaw's gateway runs on the host with full network access
- Build custom tool/skill that proxies API calls through the gateway
- API keys in `.env` or `openclaw.json` (gateway side, not sandbox side)
- Zuberi requests "call Stripe API with X payload" → gateway executes → returns result
- **Security: ✅ Keys never enter sandbox. Gateway controls access.**

**Option B: Sandbox env vars**
- Pass API keys via `sandbox.docker.env` config
- Requires sandbox network access
- **Security: 🟡 Keys inside sandbox. Model has access.**

**Option C: n8n as API middleware**
- Zuberi sends API requests to n8n via REST
- n8n handles auth, rate limiting, error handling
- Requires CEG online + n8n deployed
- **Security: ✅ Keys stay in n8n. Adds workflow layer.**

**Recommendation:** Option A for direct API calls, Option C for recurring integrations. Both keep keys out of the sandbox.

---

## Phase 3: CEG Online + Services — DONE

**Capabilities unlocked:** C6 (multi-agent), C7 (n8n), C9 (CXDB), C16 (ccode sub-agent)
**Stages improved:** Build → 🟡 (ccode pending auth), Automate → 🟡

**EDUP WiFi adapter: ARRIVED AND INSTALLED.**

### Step 1: CEG Online — DONE

| Step | Status | Notes |
|------|--------|-------|
| Plug EDUP adapter into CEG | ✔ | MT7921AU, kernel 6.8 native support |
| Configure WiFi | ✔ | wpa_supplicant@ + dhcpcd@ (NOT netplan — USB WiFi) |
| WiFi boot-resilient | ✔ | Auto-connects on boot (~2-3 min) |
| Install Tailscale, join tailnet | ✔ | 100.100.101.1, auto-starts on boot |
| Verify KILO ↔ CEG ping via Tailscale | ✔ | |
| SSH key KILO → CEG | ✔ | Ed25519 key auth |
| Docker installed on CEG | ✔ | v29.2.1, docker-ce + compose, DNS fix applied |
| Boot resilience verified | ✔ | WiFi, Tailscale, SSH, Docker all auto-start |

### Step 2: Deploy Services — DONE

| Service | Port | Host | Status | Notes |
|---------|------|------|--------|-------|
| SearXNG | 8888 | CEG | ✔ | JSON API enabled, limiter off, Tailscale only |
| n8n | 5678 | CEG | ✔ | Running, setup page accessible, N8N_SECURE_COOKIE=false |
| CXDB | 9009 | CEG | ✔ | Binary protocol, built from source (244MB) |
| CXDB UI | 9010 | CEG | ✔ | REST API + React UI, Tailscale only |
| ccode CLI | — | CEG | ⏳ | Headless auth TBD |

Docker compose: /opt/zuberi/docker/docker-compose.yml
Data volumes: /opt/zuberi/docker/{searxng,n8n,cxdb}/
All services: restart=always, bound to 100.100.101.1 (Tailscale only)
CXDB source: /opt/zuberi/cxdb/ (cloned from github.com/strongdm/cxdb)
CXDB types: Bundle zuberi-2026-02-28 (Note, Decision, Preference, Task)

### Step 3: Wire to Zuberi — IN PROGRESS (moved to Phase 3A)

| Connection | Method | Status |
|-----------|--------|--------|
| Zuberi ↔ SearXNG | Workspace skill + gateway exec | ✔ Skill deployed, end-to-end test pending |
| Zuberi ↔ CXDB | Workspace skill + gateway exec | ✔ Skill deployed, end-to-end test pending |
| Zuberi ↔ ccode | SSH dispatch from KILO | ⏳ Headless auth TBD |
| Zuberi ↔ n8n | REST API via Tailscale | ⬜ Not started |

### Trigger conditions
- [x] EDUP WiFi adapter arrived
- [x] CEG joins tailnet (100.100.101.1)
- [x] Docker running on CEG
- [ ] Ccode headless auth method resolved (see HORIZON.md §4)

### Solution details

**Multi-Agent Coordination (C6/C16):**
```
ZUBERI (orchestrator, KILO)
  → dispatches coding tasks to CEG-ccode via SSH
  → parses JSON results
  → logs to sub-agent kanban
  → reports to James or chains next subtask

Dispatch pattern:
  ssh ceg "cd /opt/zuberi/projects/<project> && claude -p '<task>' --output-format json --max-turns 5"
```

Key properties:
- Ccode in headless mode (`-p`) is functionally an agent
- CEG-ccode is Zuberi's hands. KILO ccode is James's personal tool. Separate.
- Builds directly on CEG filesystem — no Tailscale mount latency
- Session chaining via `--session-id` for multi-step builds
- Tool scoping via `--allowedTools` per invocation

**Workflow Automation (C7 — n8n):**
- n8n on CEG as one tool in the toolbox (not a defining service)
- Zuberi builds workflows by calling n8n's API (requires James approval to activate)
- n8n executes workflows on schedule, reports back
- n8n is an automation layer, not an agent. It doesn't plan or reason.

**Stronger Reasoning (C10):**
- Partially resolved: ccode sub-agent runs Claude (Sonnet/Opus) via Anthropic API
- For non-coding tasks: GPU upgrade for larger local model, or broader Claude API integration
- Full resolution requires Phase 5 (Zuberi Home) or expanded API access

---

## Phase 3A: Integration + Wiring — IN PROGRESS

**After Phase 3 services are running.** Phase 3 is done. This is the active phase.

| Step | Status | Notes |
|------|--------|-------|
| SearXNG workspace skill deployed | ✔ | skills/searxng/SKILL.md, networking verified |
| CXDB workspace skill deployed | ✔ | skills/cxdb/SKILL.md (type names updated) |
| SearXNG end-to-end test from webchat | ❌ | Skill not triggering — model behavior issue, not networking |
| CXDB end-to-end test from webchat | ⬜ | Next: test via Zuberi webchat |
| OpenClaw memory config tuned | ✔ | Hybrid search + embedding cache applied |
| IDENTITY.md + USER.md populated | ✔ | Ccode filled from lived experience |
| Security hardening (5 tasks) | ✔ | MFA, UFW, n8n auth, Docker pins, SSH Tailscale-only |
| CEG network watchdog | ✔ | Auto-recovery within 60s, systemd timer |
| Zuberi app chat display | ✔ | Multi-session blocker resolved |
| Models dropdown + GPU status | ✔ | Direct Ollama API, auto-refresh, Clear GPU |
| Vitest smoke test suite | ✔ | 13/13 tests passing |
| Kanban relocated to context menu | ✔ | Opens localhost:3001 in browser |
| Compact chat input (Claude.ai style) | ✔ | Auto-expand, scroll after 6 lines |
| File upload + CEG sync | ✔ | Workspace path, scp to CEG /opt/zuberi/files/ |
| Right-click context menu | ✔ | File, Kanban, Edit, View, Help |
| OpenClaw media endpoint check | ✔ | NOT available in v2026.2.26 (405) |
| Container name alias (openclaw) | ⬜ | Add container_name to docker-compose |
| Ccode headless auth on CEG | ⬜ | Research needed (HORIZON.md §4) |
| AgentMail MCP registration | ⬜ | agentmail-mcp server in OpenClaw |
| n8n wiring to Zuberi | ⬜ | REST API via Tailscale |
| n8n autonomy boundaries | ⬜ | Update AGENTS.md |
| First n8n workflow test via Zuberi | ⬜ | |
| File upload system architecture | ✔ | Workspace path chosen (gateway media endpoint N/A) |

---

## Phase 4: Mission Launch

**After Phase 3A. Zuberi has research, build, and automation capabilities online.**

| Step | Status | Notes |
|------|--------|-------|
| Strategy discussion concluded | ⬜ | James + Architect |
| MISSION-350K.md drafted | ⬜ | With real data from Zuberi's research |
| CAPABILITIES.md created | ⬜ | Zuberi's live self-upgrade tracker |
| Start date set | ⬜ | 180-day clock begins |
| Revenue stream research by Zuberi | ⬜ | Using C4 web search + C14 browser |

**Parameters (decided):**
- Target: $350,000 in 180 days
- Capital: $1,000–$5,000
- James's time: 15–25 hrs/wk
- Streams: SaaS, freelance/consulting, digital products, Zuberi-recommended
- Scope: any legal revenue, highest-probability paths
- Dual tracks: revenue + capability growth (equal priority)

---

## Phase 5: Zuberi Home Build — FUTURE

**Capabilities unlocked:** C6 (full multi-agent), C10 (stronger local model), C13 (image gen), C17 (unified vision, no swap)
**Stages improved:** All stages — quality and throughput ceiling raised

### What to do

1. Build Zuberi Home (dedicated hardware — RTX 3090 24GB+ target, or leverage KILO's RTX 5070 Ti 16GB)
2. Install and configure
3. Load unified model: Qwen3.5:35b (brain + eyes in one model, no swapping)
4. Consider additional specialist agents if mission demands it
5. (Optional) Deploy local image generation model
6. Migrate workloads from KILO to Zuberi Home as appropriate

### Trigger conditions
- [ ] Zuberi Home hardware decision finalized
- [ ] Hardware built and configured
- [ ] Phases 1-4 stable
- [ ] Mission execution reveals need for more local compute

**Impact:** Unified Qwen3.5 model eliminates brain/eyes swapping — simultaneous reasoning
and vision in every call. Larger models, faster inference, full local autonomy at scale.

---

## Solutions Reference — Additional Details

### Structured Data Output + Document Generation (C8, C15)

Dependency of C5 (package install). Once the custom sandbox image includes
the right Python libraries, these capabilities unlock automatically.

**Libraries in custom sandbox image:**
- `openpyxl` — xlsx creation and editing
- `reportlab` — pdf generation
- `python-docx` — docx creation and editing
- `matplotlib` — charts and graphs
- `pandas` — data manipulation and csv/xlsx conversion

No config change needed beyond Phase 2B custom image.

### Image/Diagram Generation (C13)

Bake Mermaid CLI + Matplotlib into custom sandbox image (covers diagrams + charts).
Defer local image generation model until Phase 5 (Zuberi Home GPU).

### Persistent Memory (C11)

Testing and usage problem, not a config problem.

Steps to validate:
1. Multi-turn session where decisions are made
2. Observe: does Zuberi write to `memory/YYYY-MM-DD.md` at compaction?
3. New session — ask about something from previous session
4. Check: does memorySearch find relevant context?
5. If not working, diagnose gateway logs

Config now tuned: hybrid search (BM25 0.3 + vector 0.7), embedding cache (50K entries),
minScore lowered to 0.25 for broader recall. Restart needed to activate.

---

## Current State Summary

```
Stage Readiness:
  RESEARCH    🟡 → SearXNG skill deployed but not triggering. Networking works. Model behavior issue.
  STRATEGY    ✅   (improves with research inputs)
  MODEL       🟡 → Phase 2B (custom image) unlocks to ✅
  DESIGN      ✅   (improves with diagram rendering + vision in Phase 2B)
  BUILD       ❌ → needs Phase 2B + 2D + ccode auth for full unlock
  AUTOMATE    🟡 → n8n + CXDB running, security hardened, wiring next

Phase Progress:
  Phase 1   ████████████████████  Done
  Phase 1A  ████████████████████  Done (GPU upgraded to RTX 5070 Ti 16GB)
  Phase 2A  ════════════════════  Superseded by Phase 3 (SearXNG on CEG)
  Phase 2B  ░░░░░░░░░░░░░░░░░░░░  Ready NOW — needs James approval
  Phase 2C  ░░░░░░░░░░░░░░░░░░░░  Ready NOW — needs security decisions
  Phase 2D  ░░░░░░░░░░░░░░░░░░░░  Waiting — needs network/security decision
  Phase 3   ████████████████████  DONE — CEG online, all services running, security hardened
  Phase 3A  ██████████████░░░░░░  In Progress — app complete, security done, skill triggering + wiring next
  Phase 4   ░░░░░░░░░░░░░░░░░░░░  After Phase 3A
  Phase 5   ░░░░░░░░░░░░░░░░░░░░  Future — Zuberi Home build
```

**Key insight:** Phase 3 is DONE and security-hardened. The Zuberi app is fully operational with
all planned UI features. Phase 3A's remaining gate is a single issue: skills don't trigger from
the model. SearXNG networking works, CXDB is running, but qwen3:14b-fast doesn't invoke exec
to run curl when asked to search. Fix this and the entire Phase 3A → Phase 4 path opens up.
Everything downstream (n8n wiring, learning loops, Mission AEGIS) depends on skills working.

---

## Appendix: Version History

| Version | Date | Change |
|---------|------|--------|
| 0.1.0 | 2026-02-27 | Initial — merged from FTAE.md v0.5.0 + infrastructure roadmap + VISION-TOOL-DESIGN.md v0.1.0. Retired FTAE tier numbering in favor of execution phases (1, 1A, 2A-2D, 3, 3A, 4, 5). Kept full solution options for reference. Folded vision tool design into Phase 2B. Added Phase 4 (Mission Launch) as explicit phase. Updated all statuses: EDUP arrived, qwen3-vl:8b pulled, Ollama on E:\, C:\ cleaned. |
| 0.2.0 | 2026-02-27 | Phase 3 DONE: CEG online, SearXNG/n8n/CXDB deployed and running. Updated capabilities C4/C7/C9 to 🟡. Phase 3A in progress: skill files drafted for SearXNG and CXDB. Key finding: OpenClaw config does not support custom search providers or MCP plugins — workspace skills are the integration path. |
| 0.3.0 | 2026-02-28 | Full status sync: Phase 3 sub-items reconciled with INFRASTRUCTURE.md (all Step 1 + Step 2 items ✔). Phase 1A updated (6/8 done — workspace files deployed, memory config applied, IDENTITY/USER populated). Phase 2A marked superseded (SearXNG on CEG, not KILO). Phase 3A expanded with all integration tasks. Capability table updated: C4/C9 skills deployed, C11 memory tuned, C16 CEG online. CXDB type descriptors corrected (Note/Decision/Preference/Task). Container name noted (openclaw-openclaw-gateway-1, alias planned). Stage readiness updated: Research→🟡, Automate→🟡. |

| 0.3.1 | 2026-02-28 | Model references updated: qwen3:14b → qwen3:14b-fast (primary). OpenClaw v2026.2.26 noted. 4 models available. |
| 0.4.0 | 2026-03-01 | Session 5-7 update: GPU upgraded RTX 3060→RTX 5070 Ti 16GB. Phase 1A DONE. Security hardening complete (5 tasks). CEG network watchdog deployed. Zuberi app fully operational: chat fixed, models dropdown, GPU status, Clear GPU, compact Claude.ai-style input, file upload with CEG sync, right-click context menu, Kanban relocated to browser. Vitest smoke suite (13 tests). OpenClaw media endpoint confirmed N/A in v2026.2.26 — workspace path used instead. SearXNG skill trigger issue identified (model behavior, not networking) — THE remaining Phase 3A blocker. |

**Lineage:**
- FTAE.md v0.1.0–v0.5.0 (2026-02-25 to 2026-02-26) — capability inventory, solutions, tiers
- VISION-TOOL-DESIGN.md v0.1.0 (2026-02-26) — vision skill implementation reference
- Infrastructure roadmap from Conversation 1 — phase sequence

---
# END RTL.md
