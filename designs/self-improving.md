# Self-Improving Corrections Log — Design
# Created: Session 21
# Status: Designed, not built

## Source

Cannibalized from ClawHub self-improving skill. Take three ideas, skip the rest:
- **TAKE**: Corrections log — structured record of mistakes and corrections
- **TAKE**: Self-reflection — periodic review of correction patterns
- **TAKE**: Namespace isolation — corrections data separate from conversation memory
- **SKIP**: Heartbeat integration (disabled)
- **SKIP**: File tree snapshot (redundant with CXDB + Chroma)
- **SKIP**: ClawHub dependencies
- **SKIP**: SOUL.md modification (James controls identity)

## Architecture

### corrections.md (workspace root file)

A structured log that Zuberi appends to when James corrects her:

```markdown
# CORRECTIONS LOG

## Format
| Date | Category | What I Did Wrong | What I Should Do | Source |
|------|----------|-----------------|-----------------|--------|

## Entries
| 2026-03-15 | fabrication | Inflated project list from 5 to 8 | Only report what's in MEMORY.md | James, Session 21 |
| 2026-03-15 | fabrication | Summarized paywalled article | Disclose access limitation | James, Session 21 |
```

### AGENTS.md instruction

Add a section to AGENTS.md telling Zuberi:
1. When James corrects you, append to corrections.md
2. Before answering questions about project status, check corrections.md for relevant past mistakes
3. Periodically (every ~10 conversations) read corrections.md and reflect on patterns

### Categories

- **fabrication** — presenting unverified info as fact
- **inflation** — repackaging unrelated work as progress
- **tool-avoidance** — refusing to attempt commands based on past failures
- **naming** — using retired terminology
- **skill-loading** — using wrong tool path or pattern

## Implementation

CC creates:
1. corrections.md in workspace root
2. AGENTS.md section with correction logging instruction
3. Seed with existing Session 21 corrections

Z uses it:
1. Appends new corrections as they happen
2. Reads before answering status questions
3. Self-reflects on patterns

## Not Included

No automated scoring, no performance metrics, no self-modification of behavior rules. James coaches directly. The log is a memory aid, not an autonomous feedback loop.
