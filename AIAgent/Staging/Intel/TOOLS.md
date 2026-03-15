# TOOLS.md — Zuberi
# Operator: James | Wahwearro Holdings, LLC
# Version: 0.8.1 | 2026-03-02
#
# How to use tools — not which tools exist (OpenClaw policy controls that).
# Update when: new tool/skill added, workaround found, James gives preference.

---

## ⚡ Quick Tool Commands — USE THESE DIRECTLY

When a task requires these tools, use exec to run the curl command directly.
Do NOT ask for permission for read-only searches. These run at gateway level.

> **NEVER use the built-in `web_search` or `web_fetch` tools.** No API key is
> configured and they will fail. For ALL web searches, use the SearXNG curl
> command below via `exec`. This is the ONLY search path that works.

### Web Search (SearXNG on CEG)
```bash
curl -s "http://100.100.101.1:8888/search?q=QUERY&format=json"
```
Replace QUERY with URL-encoded search terms. Add `&categories=news` for news,
`&time_range=week` for recent results. Always summarize results for James.
If results are empty or engines report errors, **retry once** after a few seconds
— CEG outbound connectivity can be intermittent. If the retry also fails, report
the failure to James.

### Save to Memory (CXDB on CEG)
```bash
# Create a context:
curl -s -X POST "http://100.100.101.1:9010/v1/contexts"
# Add a note (replace CONTEXT_ID):
curl -s -X POST "http://100.100.101.1:9010/v1/contexts/CONTEXT_ID/turns" \
  -H "Content-Type: application/json" \
  -d '{"type_id":"zuberi.memory.Note","type_version":1,"payload":{"role":"assistant","text":"Content here"}}'
# List contexts:
curl -s "http://100.100.101.1:9010/v1/contexts"
# Read turns:
curl -s "http://100.100.101.1:9010/v1/contexts/CONTEXT_ID/turns"
```
Types: `zuberi.memory.Note`, `zuberi.memory.Decision`, `zuberi.memory.Preference`, `zuberi.memory.Task`

### Model Management (Ollama on KILO)
```bash
# List models:
curl -s http://host.docker.internal:11434/api/tags
# Check loaded:
curl -s http://host.docker.internal:11434/api/ps
# Unload from VRAM:
curl -s http://host.docker.internal:11434/api/generate -d '{"model":"MODEL","prompt":"","stream":false,"keep_alive":"0"}'
```

### Workflow Automation (n8n on CEG)
```bash
# List workflows:
curl -s -H "X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmZDU0ZDQxNy05ZGI0LTRhYWEtOGQ5Zi1kYWZiODNmNjFhZjEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZGVhYWJmZDEtMmQ1YS00ZWY2LWE2OTktZmYzMzgyZWRmMDJkIiwiaWF0IjoxNzcyNDQwMzU5fQ.pzt_ssetvuScNGmovAjWfKT7Zsh-Lh0FNoM4dcRKPLQ" "http://100.100.101.1:5678/api/v1/workflows"
# List recent executions:
curl -s -H "X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmZDU0ZDQxNy05ZGI0LTRhYWEtOGQ5Zi1kYWZiODNmNjFhZjEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZGVhYWJmZDEtMmQ1YS00ZWY2LWE2OTktZmYzMzgyZWRmMDJkIiwiaWF0IjoxNzcyNDQwMzU5fQ.pzt_ssetvuScNGmovAjWfKT7Zsh-Lh0FNoM4dcRKPLQ" "http://100.100.101.1:5678/api/v1/executions?limit=5"
# Trigger a webhook workflow:
curl -s -X POST "http://100.100.101.1:5678/webhook/WEBHOOK_PATH" -H "Content-Type: application/json" -d '{"key":"value"}'
```
Activate/deactivate workflows requires CONFIRM. Webhook paths are per-workflow.

For detailed skill instructions, read: `skills/searxng/SKILL.md`, `skills/cxdb/SKILL.md`, `skills/ollama/SKILL.md`, `skills/n8n/SKILL.md`

---

## Architecture

```
KILO = brain + interface
  /workspace  →  C:\Users\PLUTO\openclaw_workspace  (identity, memory, skills)
  /repos      →  C:\Users\PLUTO\github\Repo          (dev repos)

CEG = toolbox + storage (via Tailscale 100.100.101.1)
  SearXNG: 8888 | n8n: 5678 | CXDB: 9009/9010 | Kanban: 3001
  SSH: ceg@100.100.101.1 | Files: /opt/zuberi/
```

---

## Core Tools (OpenClaw built-in)

### read
Read before writing. Prefer targeted reads (line ranges) over full dumps.
Never read files that look like secrets (.env, *.key, *.pem).

### write
New files: proceed. Existing files: state changes and confirm.
Never overwrite AGENTS/SOUL/MEMORY/TOOLS without explicit instruction.

### exec
Read-only commands (ls, grep, git log, docker ps): proceed freely.
Side-effect commands: state command + expected outcome, confirm first.
Destructive commands: hard stop, name what will be lost.

**Elevated exec:** Webchat runs at gateway level, bypassing sandbox network=none.
This gives access to host network including Tailscale to CEG. This is how
SearXNG/CXDB/Ollama skills work — curl runs at gateway level.

---

## Model Inventory

```
Model               Role              Speed     GPU Load
qwen3:14b-fast      Primary (active)  1-2s      9.3GB    Custom no-think template
qwen3:14b           Deep reasoning    6-11s     9.3GB    Thinking enabled
qwen3-vl:8b         Vision            varies    5.7GB    Image/doc understanding
gpt-oss:20b         Backup            slow      13.8GB   Too large for full GPU
```

RTX 5070 Ti: 16GB VRAM. One large model at a time. Models at E:\ollama\models.
Unload model for video/gaming. Model auto-loads on next message.

---

## Sub-Agent: CEG-Ccode

Dispatch pattern:
```bash
ssh ceg "cd /opt/zuberi/projects/<project> && claude -p '<task>' --output-format json --max-turns 5 --allowedTools Read,Write,Bash"
```

Key rules:
- Parse JSON result, check for errors before reporting success
- Log to `/workspace/working/sub-agents/YYYY-MM-DD-kanban.md`
- Always include STOP conditions and verification steps in prompts
- Auth expires without warning — if auth error, report to James
- Not available until ccode authenticated on CEG (headless auth TBD)

---

## Vision Tool (qwen3-vl:8b)

Gateway-level API call to Ollama. Triggers model swap (~5-10s).
```bash
curl -s http://host.docker.internal:11434/api/chat -d '{
  "model":"qwen3-vl:8b",
  "messages":[{"role":"user","content":"<prompt>","images":["<base64>"]}],
  "stream":false
}'
```
Batch vision tasks when possible. Store results as JSON. Reload qwen3:14b-fast when done.
Status: qwen3-vl:8b pulled, skill not yet implemented.

---

## Stack Guidance

### Ollama (host.docker.internal:11434)
From host: localhost:11434. Models at E:\ollama\models (user-level env var).
Runs as user process, not service. Never pull without confirmation.

### OpenClaw (localhost:18789)
v2026.2.26. Container: openclaw-openclaw-gateway-1. Config: C:\Users\PLUTO\openclaw_config\openclaw.json.
Sandbox: non-main. Elevated exec for webchat. Reasoning: false (Qwen3 thinks natively).
Restart drops sessions — confirm first.

### ZuberiChat Repo
Path: `C:\Users\PLUTO\github\Repo\ZuberiChat`
- git status + git log before touching files
- `pnpm test` before and after every change (13 smoke tests)
- Tauri: invoke() for JS↔Rust bridge, not fetch()
- Work on main branch (no feature branches)
- Never git push or git reset --hard without confirmation

### Docker
- `docker ps`, `docker logs --tail 50`: safe anytime
- Restart/remove: confirm first
- `docker system prune`: never without explicit instruction

---

## Tool Use Patterns

**Research:** SearXNG search → gather local context → synthesize with citations → write to daily memory if worth keeping
**Dev task:** git status/log → read relevant files → state plan → make changes → verify → summarize
**Build (CEG):** define task → dispatch to CEG-ccode → parse JSON → log kanban → report
**System task:** understand state (read-only) → state intent → confirm if side-effect → execute → verify
**Memory:** identity/preference → MEMORY.md | session detail → memory/YYYY-MM-DD.md | structured → CXDB

---

## Confirm vs Proceed

| Action | Confirm? |
|--------|----------|
| Read any file / read-only exec | No |
| Write new file | No |
| Web search (SearXNG) | No |
| Dispatch to CEG-ccode | No (log to kanban) |
| Ollama model load/unload | No |
| Write existing file | Yes |
| Exec with side effects | Yes |
| docker restart | Yes |
| git push | Yes |
| Delete anything | Yes — name what's deleted |
| Modify AGENTS/SOUL/MEMORY/TOOLS | Yes — explicit instruction only |
| CXDB write | Yes |
| Install on CEG / deploy sub-agent | Yes |

---

## Version History

| Version | Date | Change |
|---------|------|--------|
| 0.1-0.7 | 2026-02-24 to 2026-03-01 | Initial through workspace skills, smoke tests, security |
| 0.8.0 | 2026-03-02 | Trimmed for context efficiency. Added Quick Tool Commands section with inline curl commands for SearXNG, CXDB, Ollama. Removed verbose ccode quirks (see HORIZON.md). Compressed vision, stack guidance, version history. GPU updated to RTX 5070 Ti 16GB. |
| 0.8.1 | 2026-03-02 | Added n8n Quick Tool Commands and skill reference. API key integrated for workflow management. |

---
# END TOOLS.md
