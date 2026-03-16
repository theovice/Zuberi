---
name: heartbeat
description: "Proactive heartbeat schedule configuration — currently DISABLED (every: 0m). Use only when asked about re-enabling heartbeat, checking heartbeat status, or troubleshooting session collision issues caused by heartbeat. Also activates for: 'is the heartbeat running,' 'why is heartbeat off,' or 'turn heartbeat back on.' NOT needed for normal operation while heartbeat is disabled."
---

# Heartbeat — DISABLED

Heartbeat is disabled (every: "0m" in openclaw.json).
Do not run heartbeat checks.

If James asks to re-enable:
1. Set agents.defaults.heartbeat.every to "30m" in openclaw.json
2. Restart gateway: docker compose down && docker compose up -d
3. Warning: heartbeat runs in the same session as chat — may cause collision
