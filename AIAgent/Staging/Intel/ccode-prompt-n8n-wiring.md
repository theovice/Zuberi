# Ccode Prompt: Deploy n8n Skill + Update Workspace Files

## Context
We are wiring n8n (running on CEG at 100.100.101.1:5678) to Zuberi via a new workspace skill. This follows the same exec/curl pattern as the existing SearXNG, CXDB, and Ollama skills. The n8n API key has been generated and is included in the skill file.

## Tasks (in order)

### Task 1: Deploy the n8n skill
Create the file `C:\Users\PLUTO\openclaw_workspace\skills\n8n\SKILL.md` with the exact contents below. Do not modify the content — deploy as-is.

```markdown
---
name: n8n
description: Manage and trigger n8n workflows on CEG. Use when the user asks about automation, wants to create or run workflows, check workflow status, list executions, or trigger automated tasks like health checks, backups, or notifications.
---

# n8n Workflow Automation

n8n runs on CEG as Zuberi's workflow automation engine. Use this skill to manage
workflows, check execution history, and trigger webhook-based automations.

## When to use

- User asks to automate a task or create a workflow
- User asks about workflow status or execution history
- You need to trigger an automated task (health check, backup, notification)
- User asks "what automations are running" or "show me my workflows"
- You need to activate or deactivate a workflow
- An n8n webhook needs to be called as part of a larger task

## Authentication

All API calls require the `X-N8N-API-KEY` header.

```
# SECRET — do not sync to cloud, version control, or workspace docs
N8N_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmZDU0ZDQxNy05ZGI0LTRhYWEtOGQ5Zi1kYWZiODNmNjFhZjEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZGVhYWJmZDEtMmQ1YS00ZWY2LWE2OTktZmYzMzgyZWRmMDJkIiwiaWF0IjoxNzcyNDQwMzU5fQ.pzt_ssetvuScNGmovAjWfKT7Zsh-Lh0FNoM4dcRKPLQ"
```

Use this key in every curl call as shown below.

## API Base URL

`http://100.100.101.1:5678/api/v1`

## Operations

### List all workflows

```bash
curl -s -H "X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmZDU0ZDQxNy05ZGI0LTRhYWEtOGQ5Zi1kYWZiODNmNjFhZjEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZGVhYWJmZDEtMmQ1YS00ZWY2LWE2OTktZmYzMzgyZWRmMDJkIiwiaWF0IjoxNzcyNDQwMzU5fQ.pzt_ssetvuScNGmovAjWfKT7Zsh-Lh0FNoM4dcRKPLQ" "http://100.100.101.1:5678/api/v1/workflows"
```

Returns JSON with `data` array of workflow objects. Each has `id`, `name`, `active`, `createdAt`, `updatedAt`.

### Get a specific workflow

```bash
curl -s -H "X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmZDU0ZDQxNy05ZGI0LTRhYWEtOGQ5Zi1kYWZiODNmNjFhZjEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZGVhYWJmZDEtMmQ1YS00ZWY2LWE2OTktZmYzMzgyZWRmMDJkIiwiaWF0IjoxNzcyNDQwMzU5fQ.pzt_ssetvuScNGmovAjWfKT7Zsh-Lh0FNoM4dcRKPLQ" "http://100.100.101.1:5678/api/v1/workflows/WORKFLOW_ID"
```

Replace WORKFLOW_ID with the workflow's numeric ID.

### Activate a workflow

```bash
curl -s -X PATCH -H "X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmZDU0ZDQxNy05ZGI0LTRhYWEtOGQ5Zi1kYWZiODNmNjFhZjEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZGVhYWJmZDEtMmQ1YS00ZWY2LWE2OTktZmYzMzgyZWRmMDJkIiwiaWF0IjoxNzcyNDQwMzU5fQ.pzt_ssetvuScNGmovAjWfKT7Zsh-Lh0FNoM4dcRKPLQ" -H "Content-Type: application/json" -d '{"active":true}' "http://100.100.101.1:5678/api/v1/workflows/WORKFLOW_ID"
```

**CONFIRM with James before activating any workflow.**

### Deactivate a workflow

```bash
curl -s -X PATCH -H "X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmZDU0ZDQxNy05ZGI0LTRhYWEtOGQ5Zi1kYWZiODNmNjFhZjEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZGVhYWJmZDEtMmQ1YS00ZWY2LWE2OTktZmYzMzgyZWRmMDJkIiwiaWF0IjoxNzcyNDQwMzU5fQ.pzt_ssetvuScNGmovAjWfKT7Zsh-Lh0FNoM4dcRKPLQ" -H "Content-Type: application/json" -d '{"active":false}' "http://100.100.101.1:5678/api/v1/workflows/WORKFLOW_ID"
```

**CONFIRM with James before deactivating any workflow.**

### List executions

```bash
curl -s -H "X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmZDU0ZDQxNy05ZGI0LTRhYWEtOGQ5Zi1kYWZiODNmNjFhZjEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZGVhYWJmZDEtMmQ1YS00ZWY2LWE2OTktZmYzMzgyZWRmMDJkIiwiaWF0IjoxNzcyNDQwMzU5fQ.pzt_ssetvuScNGmovAjWfKT7Zsh-Lh0FNoM4dcRKPLQ" "http://100.100.101.1:5678/api/v1/executions?limit=10"
```

Add `&status=error` to filter failed executions, or `&workflowId=ID` to filter by workflow.

### Get execution details

```bash
curl -s -H "X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmZDU0ZDQxNy05ZGI0LTRhYWEtOGQ5Zi1kYWZiODNmNjFhZjEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZGVhYWJmZDEtMmQ1YS00ZWY2LWE2OTktZmYzMzgyZWRmMDJkIiwiaWF0IjoxNzcyNDQwMzU5fQ.pzt_ssetvuScNGmovAjWfKT7Zsh-Lh0FNoM4dcRKPLQ" "http://100.100.101.1:5678/api/v1/executions/EXECUTION_ID"
```

### Trigger a webhook workflow

Webhook workflows have their own URLs, separate from the REST API. The URL
format is `http://100.100.101.1:5678/webhook/PATH` where PATH is set in the
Webhook trigger node of the workflow.

```bash
# GET trigger:
curl -s "http://100.100.101.1:5678/webhook/PATH"

# POST trigger with data:
curl -s -X POST "http://100.100.101.1:5678/webhook/PATH" \
  -H "Content-Type: application/json" \
  -d '{"key":"value"}'
```

Webhook URLs do NOT use the API key — they have their own auth if configured
in the Webhook node settings.

## Autonomy Rules

Per AGENTS.md Section 2:
- **Read-only operations** (list workflows, list executions, get details): proceed freely
- **Activate/deactivate workflows**: CONFIRM with James
- **Create or modify workflows**: CONFIRM with James
- **Trigger webhook workflows**: proceed for health checks and read-only tasks;
  CONFIRM for anything with side effects (backups, deploys, data modifications)

## Webhook Registry

Active webhook workflows and their trigger URLs. Update this list as workflows
are created.

```
Workflow          Webhook Path                    Method   Purpose
──────────────────────────────────────────────────────────────────
(none yet — first workflows to be created)
```

## Important

- n8n is at http://100.100.101.1:5678 (Tailscale, CEG server)
- n8n UI login: james@zuberi.local (owner account)
- All API calls require the X-N8N-API-KEY header
- Webhook trigger URLs are separate from the REST API
- Never dump raw JSON — summarize workflows and executions for James
- If API calls return 401, the key may have expired — report to James
- No jq — parse responses with grep/sed if needed, or summarize from raw output
```

### Task 2: Update TOOLS.md — Add n8n to Quick Tool Commands

Open `C:\Users\PLUTO\openclaw_workspace\TOOLS.md`.

Find the line that says:
```
For detailed skill instructions, read: `skills/searxng/SKILL.md`, `skills/cxdb/SKILL.md`, `skills/ollama/SKILL.md`
```

Replace it with:
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
```

Then update the version history table at the bottom of TOOLS.md. Add a new row:
```
| 0.8.1 | 2026-03-02 | Added n8n Quick Tool Commands and skill reference. API key integrated for workflow management. |
```

And update the version comment at the top of the file from `0.8.0` to `0.8.1` and today's date.

### Task 3: Update TOOLS.md Architecture section

In the Architecture section of TOOLS.md, find:
```
CEG = toolbox + storage (via Tailscale 100.100.101.1)
  SearXNG: 8888 | n8n: 5678 | CXDB: 9009/9010
```

Replace with:
```
CEG = toolbox + storage (via Tailscale 100.100.101.1)
  SearXNG: 8888 | n8n: 5678 | CXDB: 9009/9010 | Kanban: 3001
```

### Task 4: Update INFRASTRUCTURE.md

Open `C:\Users\PLUTO\openclaw_workspace\INFRASTRUCTURE.md`.

1. In the Phase 3 Services table, find the line:
```
n8n             CEG     5678    Tailscale only      ✅ Running (N8N_SECURE_COOKIE=false)
```
Replace with:
```
n8n             CEG     5678    Tailscale only      ✅ Running (API key auth, skill wired)
```

2. Add Veritas-Kanban to the Phase 3 Services table after the cxdb lines:
```
kanban          CEG     3001    Tailscale only      ✅ Running (Express 5, JWT+API key auth)
```

3. In the Integration status section, find:
```
- n8n: Running, setup page accessible, NOT wired to Zuberi yet
```
Replace with:
```
- n8n: Running, API key auth, skill deployed, wired to Zuberi via REST API
- Kanban: Running on CEG:3001, CLAWDBOT_GATEWAY set to KILO OpenClaw
```

4. Add Kanban to the Port Inventory:
```
3001    Veritas Kanban       CEG     Tailscale only (Phase 3)
```

5. Add Kanban data volume to the CEG Directory Structure under `/opt/zuberi/`:
```
├── data/                   Service data volumes
│   ├── n8n/                n8n workflow data
│   ├── kanban/             Veritas-Kanban persistent data
│   └── backups/            Automated backup storage (planned)
```

6. Update the GPU reference in the KILO Node Inventory from:
```
GPU:          RTX 3060 12GB (shared: inference + desktop apps + video decode)
```
to:
```
GPU:          RTX 5070 Ti 16GB + Intel UHD 770
```

7. Update the Ollama Model Inventory VRAM constraint from:
```
**VRAM constraint:** RTX 3060 has 12GB. Only one large model at a time.
```
to:
```
**VRAM constraint:** RTX 5070 Ti has 16GB. One large model at a time for best performance.
```

8. Update version history:
```
| 0.8.0 | 2026-03-02 | n8n skill wired (API key auth, REST API integration). Veritas-Kanban added to service map (CEG:3001). GPU updated to RTX 5070 Ti 16GB. Port inventory and integration status updated. |
```

And update the version at the top from `0.7.0` to `0.8.0`.

### Task 5: Verify the skill file was created correctly

After creating the skill file, verify:
```powershell
Get-Content "C:\Users\PLUTO\openclaw_workspace\skills\n8n\SKILL.md" | Select-Object -First 5
```

Should show:
```
---
name: n8n
description: Manage and trigger n8n workflows on CEG...
---
```

### Task 6: End-to-end API test from KILO

Run this from PowerShell to verify the n8n API is reachable and the key works:

```powershell
curl -s -H "X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmZDU0ZDQxNy05ZGI0LTRhYWEtOGQ5Zi1kYWZiODNmNjFhZjEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZGVhYWJmZDEtMmQ1YS00ZWY2LWE2OTktZmYzMzgyZWRmMDJkIiwiaWF0IjoxNzcyNDQwMzU5fQ.pzt_ssetvuScNGmovAjWfKT7Zsh-Lh0FNoM4dcRKPLQ" "http://100.100.101.1:5678/api/v1/workflows"
```

Expected: JSON response with a `data` array (may be empty if no workflows exist yet). A 200 status confirms the key works.

Then test from inside the OpenClaw container to verify gateway-level access:
```powershell
docker exec openclaw-openclaw-gateway-1 curl -s -H "X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmZDU0ZDQxNy05ZGI0LTRhYWEtOGQ5Zi1kYWZiODNmNjFhZjEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZGVhYWJmZDEtMmQ1YS00ZWY2LWE2OTktZmYzMzgyZWRmMDJkIiwiaWF0IjoxNzcyNDQwMzU5fQ.pzt_ssetvuScNGmovAjWfKT7Zsh-Lh0FNoM4dcRKPLQ" "http://100.100.101.1:5678/api/v1/workflows"
```

This second test confirms Zuberi can reach n8n from inside the container at gateway level. If this fails but the PowerShell test succeeds, there's a container networking issue to debug.

## Important notes
- Do NOT use jq anywhere. No jq pipes in any commands.
- The n8n API key is a JWT — it's long. Copy it exactly.
- TOOLS.md and INFRASTRUCTURE.md are operator-controlled files. These updates are explicitly authorized by James via the architect session.
- Do NOT modify AGENTS.md or SOUL.md.
