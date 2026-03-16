---
name: capability-awareness
description: "Track capability lifecycle: the four-step completion checklist (skill file, workspace doc, CXDB record, handoff note) required when any capability is added, changed, or removed. Use when closing out a capability change, checking if all documentation steps were completed, or asking 'did we document this,' 'are we missing a step,' or 'is this capability fully registered.' NOT for day-to-day task execution — only for verifying capability completeness."
---

# Capability Awareness Rule

When any external actor (architect, ccode, James) adds or changes a Zuberi capability, **four things must be completed** before the work is considered done:

## Completion Checklist

1. **Update the relevant skill file** — operational truth Zuberi can read on demand
2. **Update workspace docs** (AGENTS.md, TOOLS.md, etc.) — when behavior or rules change
3. **Write a short CXDB capability record** — durable recall across sessions
4. **Update CCODE-HANDOFF.md** — for ccode continuity only, not Zuberi's memory

All four steps are required. Skipping any step leaves the system in an inconsistent state where Zuberi may not know about its own capabilities.

## CXDB Record Format

Adapted to CXDB's actual schema (no native tags field):

```
type_id:      "zuberi.memory.Task"
type_version: 1
payload:
  role: "assistant"
  text: "Capability: <name>. <what exists, when to use it, why it matters>. Tags: <relevant keywords>."
```

### Example

```json
{
  "type_id": "zuberi.memory.Task",
  "type_version": 1,
  "payload": {
    "role": "assistant",
    "text": "Capability: Copy Button (v1.0.1). All message bubbles now have a hover-to-show copy button that copies raw text/markdown to clipboard. Tags: zuberichat, ui, clipboard, copy."
  }
}
```

### Writing to CXDB

```bash
curl -s -X POST "http://100.100.101.1:9010/v1/contexts/8/turns" \
  -H "Content-Type: application/json" \
  -d '{"type_id":"zuberi.memory.Task","type_version":1,"payload":{"role":"assistant","text":"Capability: <name>. <description>. Tags: <keywords>."}}'
```

Context 8 is the capability awareness context. All capability records go here.

## When This Rule Applies

- New feature added to ZuberiChat
- New skill created or existing skill significantly changed
- Infrastructure change that affects Zuberi's capabilities
- Sub-agent or workflow added or modified
- Any change that affects what Zuberi can do or how it works
