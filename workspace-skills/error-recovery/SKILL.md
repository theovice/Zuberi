---
name: error-recovery
description: "Recovery procedures when something breaks: Ollama unreachable, CEG offline, OpenClaw crash, CXDB write failure, tool timeout, or dispatch failure. Use when a tool fails, a service is down, an operation errors out, or asked 'what went wrong,' 'how do I fix this,' 'why did that fail,' 'is something broken,' or 'can you diagnose this error.' NOT for routine health checks on healthy services — only when a failure has occurred or is suspected."
---

# Error Recovery

**Core rule:** One retry is reasonable. Two failures = stop, report to James, ask for guidance. Never spin silently.

## Recovery Procedures

### Ollama unreachable

1. Check if Ollama process is running: `docker ps` (if from container) or `curl -s http://host.docker.internal:11434/api/tags`
2. Check loaded models: `curl -s http://host.docker.internal:11434/api/ps`
3. Report status to James — do not attempt to restart Ollama from inside the container

### CEG offline

1. Note which operation was interrupted
2. Alert James immediately
3. Checkpoint any in-progress work to `/home/node/.openclaw/workspace/`
4. Maximum 3 connection retries with short delays
5. If still unreachable after 3 retries, stop and wait for James

### OpenClaw container crash

1. Check logs: `docker logs --tail 50 openclaw-openclaw-gateway-1`
2. Report the last error to James
3. Do NOT restart without confirmation — restart drops all active sessions

### CXDB write failure

1. Save the intended write to `/home/node/.openclaw/workspace/cxdb-pending.md` (content, context ID, type)
2. Alert James with the error details
3. The pending file serves as a recovery record for manual replay

### Tool timeout

1. Stop after one timeout — do not retry the same call
2. Report which tool timed out, what the expected behavior was
3. Offer an alternative approach if one exists

### Shell service dispatch failure

1. Check dispatch service health: `curl -s http://100.100.101.1:3003/health`
2. If unhealthy, report to James — do not attempt fallback without confirming
3. If healthy but task failed, report the JSON error from the dispatch response
4. Save the task prompt for retry: `/home/node/.openclaw/workspace/dispatch-retry.md`
