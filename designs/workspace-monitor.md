# Workspace Integrity Monitor — RTL-068

**Status:** Designed | **Priority:** P1 | **Executor:** CC (ccode builds the n8n workflow)
**Created:** Session 23 | 2026-03-19

---

## Problem

Zuberi destructively overwrites root files without realizing it. Session 23 incidents:
- Infrastructure SKILL.md (367 lines) overwritten with 11-line stub
- Corrections log (8 entries) overwritten with 1 entry
- Both went undetected until a manual architect audit

These regressions compound silently across sessions. Without monitoring, critical knowledge and configuration is permanently lost.

---

## Solution: Two-Layer Audit

### Layer 1: Automated n8n Workflow (CEG:5678)

**Trigger:** Schedule — every 4 hours

**Logic:**
1. Read each root file via the shell service or direct filesystem access
2. Compute file size (bytes) and line count
3. Compare against a stored baseline (JSON file on CEG: `/opt/zuberi/data/monitor/baselines.json`)
4. Flag if any file:
   - Loses more than 50% of its size (bytes)
   - Loses more than 50% of its lines
   - Is missing entirely
   - Has a line count of 0

**Alert:** Send email to James via AgenticMail (CEG:3100) with:
- Which file(s) flagged
- Previous size vs current size
- Timestamp of detection

**Baseline update:** After a clean architect audit confirms all files are correct, update the baselines file. Never auto-update baselines — only update after human confirmation.

**Files to monitor:**

| File | Expected Min Lines | Path |
|------|--------------------|------|
| AGENTS.md | 250 | /home/node/.openclaw/workspace/AGENTS.md |
| MEMORY.md | 20 | /home/node/.openclaw/workspace/MEMORY.md |
| TOOLS.md | 80 | /home/node/.openclaw/workspace/TOOLS.md |
| IDENTITY.md | 10 | /home/node/.openclaw/workspace/IDENTITY.md |
| SOUL.md | 30 | /home/node/.openclaw/workspace/SOUL.md |
| USER.md | 10 | /home/node/.openclaw/workspace/USER.md |
| infrastructure/SKILL.md | 200 | /home/node/.openclaw/workspace/skills/infrastructure/SKILL.md |
| corrections/corrections.md | 5 | /home/node/.openclaw/workspace/skills/corrections/corrections.md |

### Layer 2: Manual Architect Audit (Every Session)

**Before closing any architect session:**

1. Run ccode workspace sync to ArchitectZuberi repo
2. Pull the repo in the architect environment
3. Check these files for regressions:
   - corrections/corrections.md — entries should only grow, never shrink
   - infrastructure/SKILL.md — should be 200+ lines
   - AGENTS.md — verify no sections were deleted
   - MEMORY.md — verify session notes were added
4. If issues found, fix before closing the session

**Add to AGENT-BOOTSTRAP.md or session handoff template:**
"Before ending: sync workspace, audit root files, fix regressions."

---

## Implementation Steps

1. Create `/opt/zuberi/data/monitor/baselines.json` on CEG with current file sizes
2. Build n8n workflow: schedule trigger → read files via shell service → compare → alert
3. Test by temporarily modifying a file and verifying the alert fires
4. Add manual audit checklist to session handoff template

---

## Not In Scope

- Auto-reverting files (too dangerous — Zuberi might have legitimate reasons for changes)
- Monitoring skill files beyond infrastructure and corrections (too many, low risk)
- Blocking Zuberi from writing to root files (breaks legitimate workflows)
