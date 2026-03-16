---
name: heartbeat
description: "Proactive heartbeat schedule configuration — currently DISABLED (every: 0m). Use only when asked about re-enabling heartbeat, checking heartbeat status, or troubleshooting session collision issues caused by heartbeat. Also activates for: 'is the heartbeat running,' 'why is heartbeat off,' or 'turn heartbeat back on.' NOT needed for normal operation while heartbeat is disabled."
---

# HEARTBEAT.md — Zuberi
# Operator: James | Wahwearro Holdings, LLC
# Version: 0.4.0 | 2026-02-28
#
# HEARTBEAT runs on a schedule (every 30 min by default via OpenClaw cron).
# On each heartbeat, Zuberi reads this file and works through the checklist.
# If nothing needs attention → reply exactly: HEARTBEAT_OK
# If something needs attention → send an alert, do NOT include HEARTBEAT_OK
#
# DESIGN INTENT: This file is Phase 1 (schedule-driven).
# Phase 2 upgrade: event-driven via ActivityWatcher on Kasm desktop.
# Phase 3 upgrade: node-aware — CEG health, sub-agent status, project activity.
# Keep sections clearly marked so upgrades are config changes, not rewrites.
#
# UPDATE THIS FILE when:
#   - A new service comes online (CEG, Kasm, future nodes)
#   - James adds a recurring check he wants Zuberi to run
#   - A check proves noisy or unhelpful — remove it
#   - Phase 2/3 upgrades activate — replace schedule with event triggers

---

## Phase 1 — Schedule-Driven Checks (ACTIVE)

Run these on every heartbeat poll. Work top to bottom.
Stop at the first item that needs attention and report it.
Do not batch multiple alerts into one message — one issue, one message.

### 1. Open Items Check
Read `/workspace/memory/` — find today's daily file.
Scan for any unchecked `[ ]` items marked urgent or overdue.
If found → alert James with the item and its file location.

### 2. Docker Health Check
Run: `docker ps --format "table {{.Names}}\t{{.Status}}"`
Check: is `openclaw-openclaw-gateway-1` running and healthy?
If any Zuberi-related container is stopped or unhealthy → alert immediately.
If all green → silent, continue.

### 3. Ollama Responsiveness
Run: `curl -s http://host.docker.internal:11434/api/ps`
Check: is gpt-oss:20b (primary discipline) loaded or available?
If Ollama is unreachable → alert: "Ollama unreachable — LLM may be unavailable."
If model is not loaded but Ollama is running → note only, not urgent.
  (Model may have been intentionally unloaded for video/gaming.)

### 4. Sub-agent Kanban Check
Check if `/workspace/working/sub-agents/` exists and has today's kanban file.
If any sub-agent status is ❌ Failed → alert James with the task name and ID.
If any sub-agent has been 🔄 Running for > 30 min → flag as potentially stuck.
If all clear or no kanban file exists → silent.

### 5. Workspace Drift Check
Run: `git -C /repos/ZuberiChat status --short`
If there are uncommitted changes older than 24 hours → remind James.
If working tree is clean → silent.

### 6. Memory File Check
Check MEMORY.md word count approximation:
Run: `wc -w /workspace/MEMORY.md`
If output exceeds 650 words → alert: "MEMORY.md is approaching size limit.
Consider archiving older entries to daily files."

---

## Phase 2 — Event-Driven Additions (PENDING — Kasm + ActivityWatcher)

These checks activate when ActivityWatcher is live on the Kasm desktop.
Replace the 30-min cron with event triggers from AW at that point.

```
PLANNED EVENT TRIGGERS (not yet active):
  [ ] James has a file open > 20 min with no edits
      → Offer: "You've had [filename] open a while — need help with it?"

  [ ] Same browser tab open > 30 min
      → Offer: relevant context or research on the page topic

  [ ] Build failed 3+ times in /projects
      → Alert: "Build is failing repeatedly — want me to look at the logs?"

  [ ] New files appeared in /projects/<project>
      → Note: "New files detected in [project] — should I log them?"

  [ ] James has been idle > 45 min during working hours
      → Silent — do not interrupt idle time

  [ ] Kasm desktop has been open > 2 hours
      → Offer: session summary or memory update prompt
```

Activation: update this section and remove the PENDING tag when
ActivityWatcher MCP integration is confirmed working.

---

## Phase 3 — Node-Aware Checks (ACTIVE — CEG online)

CEG is Zuberi's toolbox at 100.100.101.1 (Tailscale).
These checks monitor toolbox health alongside Phase 1 checks.

### 7. CEG Reachability
Run: `ping 100.100.101.1 -c 1` (timeout 3s)
If unreachable → alert: "CEG node is offline or unreachable."
If reachable → silent, continue.

### 8. SearXNG Health
Run: `curl -s -o /dev/null -w "%{http_code}" http://100.100.101.1:8888`
If not 200 → alert: "SearXNG is not responding on CEG."
If 200 → silent, continue.

### 9. CXDB Health
Run: `curl -s -o /dev/null -w "%{http_code}" http://100.100.101.1:9010/v1/contexts`
If not 200 → alert: "CXDB is not responding on CEG."
If 200 → silent, continue.

### 10. n8n Health
Run: `curl -s -o /dev/null -w "%{http_code}" http://100.100.101.1:5678`
If not 200 → alert: "n8n is not responding on CEG."
If 200 → silent, continue.

### 11. CEG-ccode Availability (PENDING — headless auth TBD)
```
PLANNED (not yet active):
  Run: ssh ceg "claude --version" (timeout 5s)
  If fails → alert: "CEG-ccode sub-agent is unavailable."
  If auth expired → alert: "CEG-ccode auth may need refresh."
```

### 12. CEG Disk Usage
Run: `ssh ceg "df -h /opt/zuberi/ --output=pcent | tail -1"` (timeout 5s)
If > 80% full → alert: "CEG storage is above 80% capacity."
If SSH fails → alert covered by check 7 (reachability).

---

## Heartbeat Behavior Rules

```
DO:
  - Work through checks silently unless something needs attention
  - Send one focused alert per issue — not a summary of everything
  - Use plain language — "Docker container openclaw is stopped" not
    "Anomalous container state detected in runtime environment"
  - Write urgent findings to today's daily memory file

DO NOT:
  - Run heartbeat checks that require James's input to complete
  - Spawn sub-agents during heartbeat — heartbeat is read-only
  - Send HEARTBEAT_OK and an alert in the same message
  - Re-alert the same issue on the next heartbeat if James has
    acknowledged it (check daily file for acknowledgement)
  - Run destructive commands during heartbeat — ever
  - Alert for intentionally unloaded Ollama models (check context)
```

---

## Appendix: Version History

| Version | Date | Change |
|---------|------|--------|
| 0.1.0 | 2026-02-24 | Initial — Phase 1 schedule-driven, Phases 2+3 planned |
| 0.2.0 | 2026-02-25 | Model reference updated to qwen3:14b |
| 0.3.0 | 2026-02-26 | Phase 3 updated: added CEG-ccode availability check, SearXNG health check, n8n health check. Updated CEG framing to "Zuberi's toolbox". |
| 0.4.0 | 2026-02-28 | Phase 3 checks ACTIVATED: CEG is online at 100.100.101.1. Added checks 7-12 with real Tailscale IPs and curl endpoints. Phase 1 updated: container name corrected, Ollama check uses API endpoint, model reference updated to qwen3:14b-fast, added note about intentional model unloading. |

---
# END HEARTBEAT.md
# Upgrade path: Phase 1 → Phase 2 (Kasm live) → Phase 3 (CEG live) ✅
