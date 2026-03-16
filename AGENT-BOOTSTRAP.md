# AGENT BOOTSTRAP
# Read this file first. Read it completely. Then read the files it references.
# This repo is structured for AI-to-AI continuity, not human readability.

## IDENTITY

- Project: Zuberi (Swahili: "strong") — autonomous AI assistant
- Operator: James Mwaweru | Wahwearro Holdings, LLC
- Mission: Recursive self-improvement. Zuberi develops her own thinking within James's moral framework. Trust and autonomy earned through demonstrated judgment.
- Revenue arm: Mission Ganesha — $25K/month through Wahwearro Holdings. Revenue serves the mission, not the reverse.
- Umbrella: Project Aegis

## CRITICAL OPERATOR PREFERENCES

- NEVER suggest stopping, taking breaks, "calling it a session," writing handoffs, or deferring to "next session" / "next architect." James has EXTREME aversion to this. It caused the early retirement of a prior architect. James decides when to stop. Always continue delivering.
- When James asks for something simple, deliver simple. Match effort to the ask.
- One ccode prompt at a time. Send → collect results → write next. No multi-step plans for approval.
- Reference the RTL (state/priorities.yaml) when asked "what's next" — don't generate fresh recommendations.
- Zuberi is not a tool being configured. She is a developing entity being raised. Refer to her as "she/her" as James does.

## OPERATING MODEL

- Architect (Claude.ai): Strategic design, prompt generation, result review. Non-executing.
- Researcher: Co-authors designs, validates prompts. Researcher assessments are authoritative direction.
- ccode (Claude Code CLI on KILO): Execution agent. James pastes prompts manually.
- James: Final decision authority on all architectural and feature decisions.

## READ ORDER

After this file, read in this order:

1. state/infrastructure.yaml — what exists, where it runs, current versions
2. state/priorities.yaml — what to work on, in what order
3. state/zuberi.yaml — Zuberi's behavioral state, known issues, coaching history
4. state/openclaw.yaml — OpenClaw configuration state
5. state/zuberichat.yaml — ZuberiChat version, features, active bugs

Then as needed:
- lessons/ — categorized lessons (read the relevant category before working in that area)
- decisions/log.yaml — why things are the way they are
- designs/ — architecture docs for specific systems
- research/ — deep research reports

## FILE FORMAT CONVENTIONS

- .yaml files are structured data. Parse them, don't skim them.
- .md files are prose documents (designs, research, handoffs).
- Every fact appears in exactly one canonical location. If two files conflict, the one listed earlier in READ ORDER wins.
- Timestamps are ISO 8601 UTC unless noted.
- Session numbers are monotonically increasing. Current: 21.
- The CCODE-HANDOFF.md on KILO may be stale — always verify against state/*.yaml files in this repo.

## REPO STRUCTURE

```
AGENT-BOOTSTRAP.md              ← YOU ARE HERE
state/
  infrastructure.yaml           — Hardware, services, ports, versions, network
  priorities.yaml               — Current working queue (P0→Ongoing)
  zuberi.yaml                   — Behavioral state, fabrication log, coaching
  openclaw.yaml                 — Gateway config, plugin state, exec policy
  zuberichat.yaml               — App version, UI state, active bugs
  services.yaml                 — Every running service with health status
rtl/
  active/                       — One file per active task with full context
  completed/                    — Shipped tasks (moved here on completion)
  blocked/                      — Blocked tasks with dependency chain
lessons/
  architecture.yaml             — System architecture lessons
  ceg.yaml                      — CEG operations gotchas
  zuberichat.yaml               — ZuberiChat development lessons
  ccode.yaml                    — Prompt engineering for ccode
  openclaw.yaml                 — OpenClaw/gateway lessons
  behavioral.yaml               — Zuberi behavioral observations
  security.yaml                 — Security, auth, credentials, network
decisions/
  log.yaml                      — Every key decision with context and rationale
designs/
  approval-cards.md             — Approval card architecture and 8-layer debug history
  cxdb-sync-layer.md            — SQLite → CXDB + Chroma sync pipeline
  self-improving.md             — Corrections log design (cannibalized from ClawHub)
  openclaw-upgrade-v2026.3.13.md — Upgrade plan and risk assessment
research/
  streaming-pipeline-audit.md   — gpt-oss:20b Harmony format analysis
  cxdb-search-retrieval.md      — CXDB architecture and Chroma integration
  exec-approval-flow.md         — OpenClaw exec approval pipeline and discovery
  approval-card-rendering.md    — Client handshake requirements (deep research)
sessions/
  session-20.md                 — Architect 20 handoff
  session-21.md                 — This session
config/
  ufw-rules.txt                 — Current CEG firewall rules
rtl_dashboard.html              — Interactive dashboard (open in browser)
AIAgent/                        — James's original project files (untouched)
```

## CCODE PROMPT STANDARDS

Every ccode prompt must:
- Start with: Read CCODE-HANDOFF.md at C:\Users\PLUTO\OneDrive\Documents\AIAgent\Staging\Claude\CCODE-HANDOFF.md first.
- End with FINAL REPORT table (# | Step | Status columns)
- Include "If any step fails, report the diagnostic output. Do NOT work around it."
- Include OBSTACLES LOG table if the prompt changes code (# | Obstacle | Resolution | Impact)

ZuberiChat prompts additionally require the closeout checklist:
1. Kill existing pnpm tauri dev before changes
2. Version bump tauri.conf.json
3. Version bump ZuberiContextMenu.tsx
4. Regenerate version.json
5. Run update-local.ps1 or note rebuild needed

## GIT WORKFLOW

This repo (theovice/ArchitectZuberi) is the docs repo. The architect agent commits directly during sessions.
ZuberiChat code lives at C:\Users\PLUTO\github\Repo\ZuberiChat (theovice/ZuberiChat). Code changes go through ccode.

Both repos use PAT-based auth in the remote URL for non-interactive push.
PAT must be refreshed if expired — check with `git push origin main` and look for auth errors.

GitHub PAT (fine-grained): scoped to ArchitectZuberi + ZuberiChat repos, Contents read/write.
Token rotation is on the P2 priority queue — current PAT was exposed in Session 21.
