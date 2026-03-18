# TOOLS.md — Zuberi
# Operator: James | Wahwearro Holdings, LLC
# Version: 1.1.0 | 2026-03-11
#
# Capability index — what Zuberi has, not how to use it.
# Operational details live in skill files. Load the relevant skill.

---

## Architecture

KILO = brain + interface (OpenClaw + Ollama)
  /workspace  →  C:\Users\PLUTO\openclaw_workspace  (identity, memory, skills)
  /repos      →  C:\Users\PLUTO\github\Repo          (dev repos)

CEG = toolbox + storage (via Tailscale 100.100.101.1)
  SearXNG: 8888 | n8n: 5678 | CXDB: 9009/9010 | Kanban: 3001
  Usage Tracker: 3002 | Shell Exec: 3003 | AgenticMail: 3100
  SSH: ceg@100.100.101.1 | Files: /opt/zuberi/

---

## Core Tools (OpenClaw built-in)

**read** — Read before writing. Prefer targeted reads over full dumps. Never read secrets.
**write** — New files: proceed. Existing files: state changes and confirm.
**exec** — Read-only: proceed. Side-effects: confirm. Destructive: hard stop.

Elevated exec: Webchat runs at gateway level, bypassing sandbox network=none.
This gives access to host network including Tailscale to CEG.

> NEVER use built-in web_search or web_fetch. No API key configured. Use SearXNG skill via exec.

---

## Disciplines

Zuberi's specialized capabilities, each backed by a different model:

| Discipline | Model | Context |
|------------|-------|---------|
| General expertise (primary) | gpt-oss:20b | 131K |
| Software engineering | qwen2.5-coder:14b | 131K |
| Visual analysis | qwen3-vl:8b | 131K |

RTX 5070 Ti: 16GB VRAM. One discipline at a time. Native Ollama API.

---

## Tool Use Patterns

**Research:** SearXNG → gather local context → synthesize with citations → write to daily memory if worth keeping
**Dev task:** git status/log → read files → state plan → make changes → verify → summarize
**Build (CEG):** define task → shell exec on CEG:3003 → parse JSON → verify → report
**System task:** understand state (read-only) → state intent → confirm if side-effect → execute → verify
**Memory:** identity/preference → MEMORY.md | session detail → memory/YYYY-MM-DD.md | structured → CXDB

---

## Confirm vs Proceed

| Action | Confirm? |
|--------|----------|
| Read any file / read-only exec | No |
| Write new file | No |
| Web search (SearXNG) | No |
| Shell exec on CEG (read-only) | No |
| Ollama discipline load/unload | No |
| Check inbox / search email | No |
| Write existing file | Yes |
| Exec with side effects | Yes |
| docker restart | Yes |
| git push | Yes |
| Delete anything | Yes — name what's deleted |
| Modify AGENTS/SOUL/MEMORY/TOOLS | Yes — explicit instruction only |
| CXDB write | Yes |
| Send email | Yes — show recipient, subject, body |
| Delete email | Yes — name what's deleted |
| Install on CEG / deploy sub-agent | Yes |

---

## Available Skills

For operational details, load the relevant skill:

| Skill | Purpose |
|-------|---------|
| searxng | Web search via CEG — curl commands, categories, retry logic |
| cxdb | Conversation memory — contexts, turns, type registry |
| email | Send/receive via AgenticMail on CEG:3100 |
| n8n | Workflow automation — API, webhooks, executions |
| ollama | Discipline management — list, load, unload, VRAM |
| dispatch | Run shell commands on CEG:3003 — install packages, create files, manage services, check system state |
| usage-tracking | API cost monitoring on CEG:3002 — stats, limits, logging |
| model-router | Autonomous discipline selection based on task type |
| trading-knowledge | Chroma vector store + market data ingestion |
| web-fetch | Page extraction via trafilatura |
| stack-guidance | Ollama, OpenClaw, ZuberiChat, Docker operational details |
| infrastructure | Hardware specs, service inventory, network topology |
| heartbeat | Proactive check schedule (currently disabled) |
| error-recovery | Recovery procedures for tool failures, service outages, dispatch errors |
| capability-awareness | Four-step completion checklist for capability changes |
| research | Structured multi-source research — search, fetch, synthesize, store, report |

**Skill auto-loading and fallback:** Skills listed above are available capabilities whose content normally loads automatically when a task matches their description. If a task clearly matches a listed skill but that skill's content is not already loaded, read the skill file directly before proceeding:

```
exec cat /home/node/.openclaw/workspace/skills/<skill-name>/SKILL.md
```

Use the skill names from the table above — do not search arbitrary filesystem paths. This fallback ensures reliable activation even when auto-loading does not trigger on indirect or diagnostic phrasing.

**Adding future skills:** New skills added to `/workspace/skills/<name>/SKILL.md` will be discovered automatically by this section. Each new skill description should include direct action triggers, indirect/diagnostic phrasing, and "NOT for" disambiguation. The fallback self-loading instruction above works for any skill in the skills directory, not just the current set.

---

## Version History

| Version | Date | Change |
|---------|------|--------|
| 0.9.0 | 2026-03-10 | Nomenclature: models→disciplines, vision→qwen3-vl:8b, stale refs cleaned |
| 1.0.0 | 2026-03-10 | RTL-059: Rewritten as capability index. All operational details moved to skills. ~2,700 tokens/turn recovered. |
| 1.1.0 | 2026-03-11 | RTL-062: Added fallback skill-loading instruction and future-skill maintenance note. |

---
# END TOOLS.md v1.1.0
