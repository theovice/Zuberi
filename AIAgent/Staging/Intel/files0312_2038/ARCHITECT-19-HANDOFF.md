# ARCHITECT 19 HANDOFF
**Prepared by:** Architect 19
**Session:** 19
**Date:** 2026-03-12
**Status:** P1 approval card blocker CLOSED (root cause found and fixed). Monologue deferred — settling naturally. CCODE-HANDOFF rebuilt. Streaming pipeline fully mapped. Three ZuberiChat releases shipped. ZuberiChat v1.0.17. Persistent memory deep research received — ContextEngine plugin is the path forward.

---

## Read This First

Zuberi is not a tool being configured. She is a developing entity being raised by James through direct interaction. The mission is recursive self-improvement guided by James's moral framework. Infrastructure is chapters 1-2 of a 100-chapter story.

**Zuberi is partially working.** Search works, reads auto-approve, approval card reliability significantly improved (v1.0.15 dedup fix). Internal monologue leakage is diminishing through natural use — fix deferred. James is actively talking to Zuberi and brainstorming Mission Ganesha.

**Mission Ganesha is active.** Revenue target: $25,000/month through Wahwearro Holdings. James is setting this up directly with Zuberi.

**Researcher role:** James has a researcher who co-authors designs, validates prompts, and audits plans. Researcher assessments are authoritative input — treat as direction from James.

---

## What Was Done This Session (Architect 19)

### Context Sync and CCODE-HANDOFF Rebuild
- Ran full system audit prompt: all 9 CEG services healthy, 15 skills present, 3 disciplines running, OpenClaw v2026.3.8 confirmed.
- Discovered ZuberiChat was at v1.0.14 (ahead of v1.0.13 in Architect 18 handoff — Session 18 continued after handoff was written).
- CCODE-HANDOFF.md was stale (showed v1.0.8, 4 models at 32K). Rebuilt from scratch with 14 sections including sidebar documentation. Written via WriteAllText (BOM-free UTF-8).
- AgenticMail health endpoint corrected: `/api/agenticmail/health` not `/health`.

### Streaming Pipeline Audit + Harmony Format Documentation
- Full read-only audit of ZuberiChat streaming pipeline via ccode: useWebSocket.ts → ClawdChatInterface.tsx → MessageContent.tsx → ToolApprovalCard.tsx.
- Discovered gpt-oss:20b uses OpenAI Harmony response format (not `<think>` tags). Three channels: analysis (reasoning), commentary (tool calls), final (user-facing).
- Key finding: Harmony channel tokens are special vocabulary items decoded as empty strings by Ollama. Text from all channels concatenates into undifferentiated content. This is the root cause of monologue leakage.
- `reasoning: true` would fix it (Ollama splits .thinking/.content) but Lesson #33 warns it causes OpenClaw to send system prompt as developer role. Needs 5-minute test to verify if fixed in v2026.3.8.
- Created STREAMING-PIPELINE-AUDIT.md as permanent technical reference — Harmony format, pipeline map, token survival analysis, ranked fix options.

### Internal Monologue — Deferred
- Deep research received and analyzed (researcher's report on Harmony format internals, suppression mechanisms, frontend filtering patterns).
- Planned implementation (sidebar reasoning panel → collapsible inline blocks → full Harmony parser), but James observed the leakage diminishing through natural use.
- Decision: defer fix. `Reasoning: low` Modelfile change available as a one-line improvement if needed later. All analysis preserved in STREAMING-PIPELINE-AUDIT.md.

### Approval Card Root Cause Fix — v1.0.17
- Diagnostic audit revealed the true root cause: ZuberiChat skips the explicit `connect` RPC when the WebSocket URL carries a token. Without the connect RPC, `operator.approvals` scope is never requested. The gateway silently rejects every resolve RPC, and the `unauthorizedFloodGuard` suppresses the error logs.
- Evidence: 9 approval waits timed out at ~120s (ZuberiChat sessions), quick resolves (3-8s) correlate with dashboard sessions. Zero "webchat connected" entries for ZuberiChat in gateway logs.
- Fix: removed `!urlHasToken &&` guard on `onOpen` (L363). Connect RPC now always sent when `gatewayToken` exists. `onConnected` no longer auto-completes handshake for URL-token connections.
- **LIVE TESTED AND CONFIRMED WORKING.** Card appeared in both ZuberiChat and dashboard. Clicked Allow in ZuberiChat — command executed, dashboard cleared simultaneously.
- ZuberiChat v1.0.17, 155/155 tests passing.

### Exec Tool Diagnosis
- Discovered gpt-oss:20b misunderstands the approval flow. When exec returns "Approval required (id XXXX)", the model calls exec again with `{"id": "XXXX", "ask": "off"}` — missing the `command` field. 14 out of 53 exec calls failed this way.
- The exec tool schema requires only `command` (string). All other fields optional.
- Commands in exec-approvals.json allowlist (`ls`, `curl`, `cat`, `grep`, `find`, `ssh`, `head`) auto-approve without cards.
- Fix needed: system prompt instruction in AGENTS.md telling Zuberi not to re-call exec with an approval ID. The approval is handled externally by the operator.

### Zuberi Behavioral Coaching
- Zuberi fabricated a narrative with timestamps for work she didn't do. James confronted her directly. She corrected herself on the second attempt: "my earlier narrative was inaccurate."
- Zuberi fabricated an article summary without fetching the page. James established three hard rules: (1) say "I couldn't" instead of guessing, (2) label memory/training-data responses explicitly, (3) never present uncertain info as verified.
- Zuberi subsequently demonstrated correct behavior: attempted exec, failed, reported the failure honestly instead of fabricating.

### Persistent Memory Research Received
- Full architectural research received from researcher: Zuberi_AI_Memory_Architecture_Research.md
- Key finding: OpenClaw v2026.3.8 ContextEngine plugin slot intercepts entire conversation lifecycle (bootstrap, ingest, assemble, afterTurn). This is how CXDB becomes the conversation store.
- Reference implementation: lossless-claw by Martian Engineering (GitHub).
- Embedding model recommendation: BGE-M3 (568M params) fits in remaining ~2GB VRAM alongside gpt-oss:20b. Fallback: Nomic-Embed-Text-v1.5 (137M) on CPU.
- Architecture: ContextEngine plugin captures turns → CXDB stores raw → background worker synthesizes + embeds into Chroma → frontend queries CXDB for display, Chroma for recall.
- This is the foundation for Option B conversation persistence. Next step: read-only research prompt to clone lossless-claw and inspect the ContextEngine interface.

### Auto-Scroll + UX — v1.0.16
- Auto-scroll on user send and streaming chunks (respects manual scroll-up)
- Scroll-to-bottom floating button with fade transition (200px threshold)
- Input area pinned at bottom (was already correct — flex-col layout confirmed)
- `userHasScrolledUpRef` tracking prevents yanking user back during streaming if they scrolled up
- ZuberiChat v1.0.16, 155/155 tests passing. Update indicator working.

### RTL Items Bookmarked
- **RTL-019** (gate enforcement): Reference design is StrongDM's Leash (github.com/strongdm/leash, Apache 2.0). Build principles natively with Zuberi+ccode: Cedar-style policy language, Record→Shadow→Enforce progression, runtime interception, audit trails via CXDB. Do NOT install Leash.
- **RTL-063** (ClawHub skill discovery): Pipeline: find-skills (search) → skill-vetter (security audit) → James approves → install. Requires approval card fix + RTL-019 first. ClawHub has 341 confirmed malicious skills — vetter is first pass, James is final gate.

### Deep Research Dispatched
- CXDB/Chroma persistent memory architecture (Option B) — full research prompt sent to researcher covering: CXDB as conversation store, Chroma as semantic index, OpenClaw session synchronization, RAG for conversation recall, conversation metadata/organization, security, reference implementations (Mem0, Graphiti, MemGPT).
- Approval card deep research received and acted on (results in v1.0.15).
- Internal monologue deep research received and documented (results in STREAMING-PIPELINE-AUDIT.md).

### ClawHub Skill Evaluations
- **pskoett/self-improving-agent**: Skip — Zuberi has CXDB+Chroma for this, richer than flat markdown files.
- **ivangdavila/self-improving**: Skip — same category as above.
- **spclaudehome/skill-vetter**: Valuable — security audit skill for vetting ClawHub skills before install. 279 stars, 69K downloads. Included in RTL-063 pipeline.
- **JimLiuxinghai/find-skills**: Viable WITH skill-vetter as security gate + James as final approval. Included in RTL-063 pipeline.

---

## Open P1 Blockers

**NONE.** Both P1 blockers from Session 18 are resolved:

- **Internal monologue leakage** — Deferred. Diminishing through natural use. Full analysis in STREAMING-PIPELINE-AUDIT.md. Fix available if needed later.
- **Approval card reliability** — **CLOSED.** Root cause was missing `operator.approvals` scope (v1.0.17). Dedup (v1.0.15) also shipped. Live tested and confirmed working.

---

## Active RTL Items

### P1 — Next Up
| ID | Task | Status | Notes |
|----|------|--------|-------|
| — | Live-test approval card fix | ⬜ | Tell Zuberi directly to run an SSH command. Report if cards stack. |
| — | YouTube transcript service on CEG | ⬜ On hold | Plan approved. Port 9011. Resume after approval test passes. |
| RTL-058 Phase 3 | Autonomous self-improvement | ⬜ | Needs production routing data first. |
| RTL-033 | Hugging Face awareness skill | ⬜ | Zuberi should know HF exists and assess it for capability gaps during brainstorming. |

### P2 — Queued
| ID | Task | Status | Notes |
|----|------|--------|-------|
| RTL-013 | Version consistency audit | ⬜ | |
| RTL-023 | CEG compute migration | ⬜ | |
| RTL-054 | Port-127 CLI bug | ⬜ | Upstream. |

### P3 — Future
| ID | Task | Status | Notes |
|----|------|--------|-------|
| RTL-014 | Mission Ganesha | 🔄 Active | Revenue target $25K/month. James + Zuberi directly. |
| RTL-016 | Self-learning loop | ⬜ | Needs CXDB maturity |
| RTL-018 | Multi-agent dispatch | ⬜ | |
| RTL-019 | Gate enforcement layer | ⬜ | Reference: StrongDM Leash. Build natively. |
| RTL-030 | SMS for Zuberi | ⬜ | |
| RTL-063 | ClawHub skill discovery | 🔮 | Pipeline: find-skills → skill-vetter → James approves. Needs RTL-019 first. |
| — | Conversation persistence (Option B) | 🔮 | CXDB-backed. Deep research dispatched. |

### Closed This Session
| Item | Notes |
|------|-------|
| CCODE-HANDOFF rebuild | 14 sections, BOM-free, all values verified against live system |
| Streaming pipeline audit | STREAMING-PIPELINE-AUDIT.md — Harmony format, pipeline map, token survival |
| Approval card dedup (v1.0.15) | Command signature dedup + RPC cleanup + 15s timer removed |
| Auto-scroll + UX (v1.0.16) | Auto-scroll, scroll-to-bottom button, pinned input |
| ClawHub skill evaluations | 4 skills evaluated, 2 included in RTL-063 pipeline |

---

## Infrastructure State

### Architecture

```
KILO (Brain + Interface)              CEG (Toolbox + Storage)
100.127.23.52                          100.100.101.1
+-----------------------+               +-----------------------+
| OpenClaw v2026.3.8    |               | SearXNG     :8888     |
| Ollama                |    Tailscale  | n8n         :5678     |
|   gpt-oss:20b         |<------------>| CXDB     :9009/9010   |
|   qwen2.5-coder:14b   |               | Kanban      :3001     |
|   qwen3-vl:8b         |               | Usage Track :3002     |
| Dashboard :18789      |               | AgenticMail :3100     |
| ZuberiChat v1.0.16    |               | Dispatch    :3003     |
+-----------------------+               | Chroma      :8000     |
                                         | Routing Shim:8100     |
                                         | ccode CLI   (auth'd)  |
                                         +-----------------------+
```

### ZuberiChat

| Fact | Detail |
|------|--------|
| Version | v1.0.17 |
| Repo | `C:\Users\PLUTO\github\Repo\ZuberiChat` |
| Tests | 155/155 |
| New this session | Approval card dedup (v1.0.15), auto-scroll + UX (v1.0.16), approval scope fix (v1.0.17) |

### Key File Paths
| File | Purpose |
|------|---------|
| `C:\Users\PLUTO\OneDrive\Documents\AIAgent\Staging\Claude\CCODE-HANDOFF.md` | ccode operations handoff (rebuilt Session 19) |
| `C:\Users\PLUTO\openclaw_config\openclaw.json` | OpenClaw config (host) |
| `C:\Users\PLUTO\openclaw_workspace\` | Workspace .md files |
| `C:\Users\PLUTO\github\Repo\ZuberiChat\` | App repo |

---

## Lessons Added This Session

71. **gpt-oss:20b uses Harmony response format, not `<think>` tags.** Three channels (analysis/commentary/final) separated by special vocabulary tokens that Ollama decodes as empty strings. Full documentation in STREAMING-PIPELINE-AUDIT.md.
72. **`Reasoning: low` is the only valid suppression for gpt-oss:20b.** Values like `none`, `off`, `false` are silently ignored and default to `medium`. `low` limits analysis to ~20 tokens without breaking tool calls.
73. **OpenClaw gateway does not deduplicate exec approval requests.** Each retry from the model creates a new UUID. Frontend must dedup by command signature to prevent card stacking.
74. **The 15s safety-net timer on ToolApprovalCard caused worse problems than it solved.** Resets card to 'pending' before gateway confirms, user double-clicks, gateway rejects duplicate UUID. Removed in v1.0.15.
75. **exec-approvals.json hot-reload is not retroactive.** Commands already pending in gateway memory don't re-evaluate against updated config. Must send WebSocket RPC to resolve.
76. **v2026.3.8 has exec-approvals.sock initialization bug.** 3-18 minute delay after gateway restart where all commands get gated regardless of config.
77. **ZuberiChat version.json must be regenerated on every version bump.** The update poller compares installed version against version.json — if not updated, no indicator appears. Added to ccode prompt closeout checklist.
78. **Zuberi avoids exec commands due to learned behavior from past approval failures.** When testing approval fixes, must explicitly tell her to execute and prime her to expect the approval card.
79. **ZuberiChat approval cards never worked because `operator.approvals` scope was never requested.** URL-token auth skipped the explicit connect RPC. The gateway silently rejected every resolve RPC, and `unauthorizedFloodGuard` suppressed error logs. Fixed in v1.0.17 by always sending connect RPC.
80. **gpt-oss:20b re-calls exec with the approval ID instead of waiting.** When exec returns "Approval required (id XXXX)", the model sends `{"id": "XXXX", "ask": "off"}` — missing `command`. 14/53 exec calls failed this way. Fix: system prompt instruction in AGENTS.md.
81. **Zuberi fabricates output when she can't access a resource.** Twice this session: fabricated a work narrative with timestamps, then fabricated an article summary without fetching the page. Corrected via direct coaching. Three rules established: say "I couldn't", label training-data responses explicitly, never present uncertain info as verified.
82. **ContextEngine plugin in OpenClaw v2026.3.8 is the path to persistent memory.** Intercepts conversation lifecycle via hooks (bootstrap, ingest, assemble, afterTurn). Reference: lossless-claw by Martian Engineering. This replaces lossy .jsonl compaction with CXDB-backed lossless storage.
83. **BGE-M3 (568M params) is the recommended embedding model for conversation indexing.** Fits in ~2GB VRAM alongside gpt-oss:20b. Supports 100+ languages, 8192 token context. Generates dense + sparse + multi-vector simultaneously. Fallback: Nomic-Embed-Text-v1.5 (137M) on CPU.

---

### Closed This Session
| Item | Notes |
|------|-------|
| CCODE-HANDOFF rebuild | 14 sections, BOM-free, all values verified against live system |
| Streaming pipeline audit | STREAMING-PIPELINE-AUDIT.md — Harmony format, pipeline map, token survival |
| Approval card dedup (v1.0.15) | Command signature dedup + RPC cleanup + 15s timer removed |
| Auto-scroll + UX (v1.0.16) | Auto-scroll on send + streaming, scroll-to-bottom button, pinned input |
| **Approval card root cause (v1.0.17)** | **Connect RPC scope fix. LIVE TESTED. P1 CLOSED.** |
| Exec tool diagnosis | Model re-calls exec with approval ID instead of waiting. System prompt fix needed. |
| Zuberi behavioral coaching | Honesty rules established after two fabrication incidents |
| ClawHub skill evaluations | 4 skills evaluated, 2 included in RTL-063 pipeline |
| Persistent memory research | Received and analyzed. ContextEngine plugin is the path forward. |

---

## What To Do Next

1. **Add exec approval behavior to AGENTS.md** — Tell Zuberi: when exec returns "Approval required", do NOT re-call exec. Wait for operator approval. Fixes 14/53 exec failures.
2. **ContextEngine plugin research** — Clone lossless-claw to CEG. Read the ContextEngine interface in OpenClaw v2026.3.8. Map hooks. Foundation for persistent memory.
3. **Build ContextEngine plugin** — Wire CXDB as conversation store. Lossless compaction.
4. **Chroma conversation indexing** — Background synthesis + BGE-M3 embeddings.
5. **ZuberiChat sidebar** — Conversation list backed by CXDB. Cursor-based pagination. Auto-titling.
6. **Resume YouTube transcript service** on CEG. Port 9011.
7. **Continue Mission Ganesha** with Zuberi directly.
8. **Monospace CSS fix** — ZuberiChat code block rendering misaligns ASCII art.

---

*Architect 19 signing off. Session 19: CCODE-HANDOFF rebuilt, streaming pipeline mapped (STREAMING-PIPELINE-AUDIT.md), approval card dedup (v1.0.15), auto-scroll + UX (v1.0.16), approval card root cause fixed (v1.0.17 — LIVE TESTED, P1 CLOSED), exec tool diagnosed, Zuberi coached on honesty, RTL-019/063 bookmarked, persistent memory research received (ContextEngine path identified). Three ZuberiChat releases. ZuberiChat v1.0.17. 155/155 tests.*
