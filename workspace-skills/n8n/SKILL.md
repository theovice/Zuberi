---
name: n8n
description: "Manage and trigger n8n workflows on CEG. Use when asked about automations, workflow status, execution history, or to create, activate, or trigger workflows and webhooks. Also activates for n8n troubleshooting: 'is n8n running,' 'why did the workflow fail,' 'are my automations working,' or checking n8n health on CEG:5678. NOT for one-off shell commands on CEG (use dispatch skill)."
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

## Active Workflows

| Name | ID | Webhook Path | Purpose |
|------|----|-------------|---------|
| Zuberi Intake Proof v1 | iQ5xn13IyUqnJbW2 | /webhook/zuberi-intake | Proof of concept — not for production use |
| Zuberi AI Audit Intake v1 | Lv2v6AAVfS11kqeY | /webhook/zuberi-audit-intake | Triggered by Zuberi after audit tasks — stores to CXDB, emails James |

## Webhook Registry

Active webhook workflows and their trigger URLs. Update this list as workflows
are created.

```
Workflow                      Webhook Path                     Method   Purpose
─────────────────────────────────────────────────────────────────────────────────
Zuberi Intake Proof v1        /webhook/zuberi-intake            POST     RTL-002 end-to-end proof
Zuberi AI Audit Intake v1     /webhook/zuberi-audit-intake      POST     Stores to CXDB + emails James
```

## Important

- n8n is at http://100.100.101.1:5678 (Tailscale, CEG server)
- n8n UI login: james@zuberi.local (owner account)
- All API calls require the X-N8N-API-KEY header
- Webhook trigger URLs are separate from the REST API
- Never dump raw JSON — summarize workflows and executions for James
- If API calls return 401, the key may have expired — report to James
- No jq — parse responses with grep/sed if needed, or summarize from raw output
- n8n container runs with `--network host` (required for CXDB + AgenticMail access)
- Activate/deactivate via `POST /api/v1/workflows/{id}/activate` and `/deactivate` — PATCH not supported
- Webhook registration after API creation: deactivate → PUT update (with webhookId on node) → reactivate → wait 3s
- n8n expression `{{ }}` template parser conflicts with `}}` in nested JS object literals — add spaces between consecutive `}`
- CXDB audit context: context_id 7 (pre-created for audit intake workflows)
