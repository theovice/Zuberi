# RTL-059: Workspace Streamline — Implementation Guide
**Author:** Architect 16
**Date:** 2026-03-10
**Status:** Research complete. Ready to implement.
**Priority:** P1 — affects Zuberi's reasoning quality on every turn.

---

## Why This Matters

This is not a cleanup task. This is a cognitive upgrade.

Deep research (deep-research-report_Streamline.md, on file) established three empirical facts:

1. **Reasoning degrades at ~3,000 tokens of system prompt.** The "Same Task, More Tokens" paper (ACL 2024) proved that irrelevant information in context degrades reasoning — not from hitting a wall, but from consuming finite attention budget. Zuberi's root files are currently ~9,600 tokens.

2. **Instruction compliance follows P(all) = P(individual)^n.** At 10 simultaneous instructions, GPT-4o drops to 15% all-follow rate. Fewer root file instructions = higher compliance with the ones that remain.

3. **Effective context is 50–65% of advertised window.** Zuberi's 131K window is likely 65K–85K effective. Root files consume 11–15% of *usable* context, not the 7.3% it appears.

**Target:** Root files under 5,000 tokens total (from current ~9,600). TOOLS.md from ~3,200 to ~500. This is a 48% reduction that measurably improves Zuberi's reasoning quality.

---

## Current State (Post Session 16)

### Root Files (loaded every turn)

| File | Tokens | Purpose | Action |
|------|--------|---------|--------|
| TOOLS.md | 3,239 | Tool commands, architecture, disciplines, trading infra | **Major trim** — rewrite as capability index |
| AGENTS.md | 2,319 | Autonomy rules, disciplines, dispatch, dev context, errors | **Moderate trim** — move sections to skills |
| SOUL.md | 1,451 | Identity, personality, arc | **Leave** — already lean, constitution not rulebook |
| MEMORY.md | 1,382 | Persistent knowledge, projects, infra baseline, lessons | **Moderate trim** — move infra + lessons to skill |
| USER.md | 785 | About James | **Leave** — already lean |
| IDENTITY.md | 461 | Self-authored identity | **Leave** — tiny |
| **Total** | **~9,637** | | **Target: <5,000** |

### Existing Skills (on-demand, in skills/ directory)

| Skill | Tokens | Has operational details? |
|-------|--------|------------------------|
| searxng | 436 | Yes — curl commands, usage |
| cxdb | 739 | Yes — API endpoints, types |
| ollama | 1,012 | Yes — model management |
| n8n | 1,826 | Yes — workflow API |
| model-router | 1,562 | Yes — routing rules |
| email | 1,579 | Yes — AgenticMail API |
| trading-knowledge | 753 | Yes — Chroma + ingest |
| web-fetch | 547 | Yes — trafilatura |
| horizon | 6,193 | Yes — long-term vision |
| infrastructure | 4,512 | Yes — hardware/service specs |
| heartbeat | (demoted this session) | Yes — disabled feature |

**Key finding:** Most of what TOOLS.md duplicates already exists in skill files. The curl commands, API endpoints, and usage patterns in TOOLS.md are redundant with their respective skills.

---

## The Principle

From the deep research report:

> Treat root files as a kernel and skills as dynamically loaded modules.

From the IG video transcript that sparked this:

> Every file you load costs tokens, and tokens are the model's working memory. Load everything at once, and it gets foggy. Load the right file at the right moment, and it stays sharp.

The Unix philosophy applied to AI agents: small files that do one thing, composed as needed. Root files are the kernel — identity, safety, universal policy. Everything else is a module loaded on demand.

---

## Implementation Plan

### Phase 1: TOOLS.md → Capability Index (~3,200 → ~500 tokens)

This is the biggest single win. TOOLS.md currently contains:

| Section | ~Tokens | Disposition |
|---------|---------|-------------|
| Quick Tool Commands (SearXNG, CXDB, Ollama, n8n, Email) | ~1,200 | **REMOVE** — all duplicated in skill files |
| Architecture diagram | ~200 | **KEEP** — orientation every turn |
| Core Tools (read/write/exec policy) | ~250 | **KEEP** — universal policy |
| Disciplines table | ~200 | **KEEP** — always-relevant awareness |
| API Usage Tracking | ~250 | **MOVE** → new skill: `skills/usage-tracking/SKILL.md` |
| Sub-Agent: CEG-Ccode | ~300 | **MOVE** → new skill: `skills/dispatch/SKILL.md` |
| Vision Tool | ~100 | **REMOVE** — covered by visual analysis discipline + future skill |
| Trading Infrastructure | ~150 | **MOVE** → already in `skills/trading-knowledge/SKILL.md` (verify) |
| Stack Guidance | ~250 | **MOVE** → new skill: `skills/stack-guidance/SKILL.md` |
| Tool Use Patterns | ~150 | **KEEP** — universal workflow templates |
| Confirm vs Proceed table | ~200 | **KEEP** — universal decision framework |
| Version History | ~200 | **TRIM** — keep last 3 entries only |

**Rewritten TOOLS.md target structure (~500 tokens):**

```
# TOOLS.md — Zuberi
# Version: 1.0.0 | <date>

## Architecture
[KILO/CEG diagram — keep as-is]

## Core Tools (OpenClaw built-in)
[read/write/exec policy — keep as-is]

> NEVER use built-in web_search or web_fetch. Use SearXNG skill via exec.

## Disciplines
[3-row table — keep as-is]

## Tool Use Patterns
[5 workflow templates — keep as-is]

## Confirm vs Proceed
[table — keep as-is]

## Available Tool Skills
For operational details, load the relevant skill:
- searxng — web search via CEG
- cxdb — conversation memory, structured storage
- email — send/receive via AgenticMail
- n8n — workflow automation
- ollama — discipline management
- dispatch — sub-agent delegation to CEG-ccode
- usage-tracking — API cost monitoring
- trading-knowledge — Chroma + market data
- web-fetch — page extraction via trafilatura
- stack-guidance — Ollama, OpenClaw, ZuberiChat, Docker operational details

## Version History
[last 3 entries only]
```

### Phase 2: New Skills (content moving out of TOOLS.md)

Three new skill files need to be created for content that doesn't have a skill home yet:

#### skills/dispatch/SKILL.md
**Content from TOOLS.md:** Sub-Agent: CEG-Ccode section (HTTP dispatch curl commands, SSH fallback, key rules, spending controls reference)
**YAML frontmatter description:** "When Zuberi needs to delegate work to the CEG-ccode sub-agent. Covers HTTP dispatch via CEG:3003, SSH fallback, task formatting, cost logging, and error handling. Use when dispatching coding tasks, file operations, or any work that runs on CEG."

#### skills/usage-tracking/SKILL.md
**Content from TOOLS.md:** API Usage Tracking section (health, stats, limits, log curl commands, service details)
**YAML frontmatter description:** "When Zuberi needs to check API usage, spending limits, or log dispatch costs. Covers the usage tracker on CEG:3002 — health checks, stats queries, budget limits, and cost logging."

#### skills/stack-guidance/SKILL.md
**Content from TOOLS.md:** Stack Guidance section (Ollama operational notes, OpenClaw container details, ZuberiChat repo rules, Docker safety rules)
**YAML frontmatter description:** "When Zuberi needs operational details about the infrastructure stack. Covers Ollama server management, OpenClaw container operations, ZuberiChat repo conventions, and Docker safety rules. Use when troubleshooting, restarting services, or working on the app."

### Phase 3: AGENTS.md Trim (~2,319 → ~1,500 tokens)

Sections to move out of AGENTS.md:

| Section | ~Tokens | Disposition |
|---------|---------|-------------|
| §7 ZuberiChat Dev Context | ~100 | **MOVE** → `skills/stack-guidance/SKILL.md` (merge with stack guidance) |
| §12 Error Recovery | ~200 | **MOVE** → new skill: `skills/error-recovery/SKILL.md` |
| §13 Capability Awareness Rule | ~250 | **MOVE** → new skill: `skills/capability-awareness/SKILL.md` |
| §11 Session Start Ritual | ~100 | **KEEP** — runs every session |
| Version History | ~200 | **TRIM** — keep last 3 entries |

**New skill needed:**

#### skills/error-recovery/SKILL.md
**Content from AGENTS.md:** Section 12 (Ollama unreachable, CEG offline, container crash, CXDB write failure, tool timeout, CEG-ccode failure)
**YAML frontmatter description:** "When Zuberi encounters an error or failure during tool use, service access, or sub-agent dispatch. Covers recovery procedures for Ollama, CEG, Docker, CXDB, and ccode failures."

#### skills/capability-awareness/SKILL.md
**Content from AGENTS.md:** Section 13 (the four-step capability awareness rule, CXDB record format)
**YAML frontmatter description:** "When a new capability is added or changed in Zuberi's system. Defines the four-step completion checklist: skill file update, workspace doc update, CXDB record, and handoff note."

### Phase 4: MEMORY.md Trim (~1,382 → ~900 tokens)

| Section | ~Tokens | Disposition |
|---------|---------|-------------|
| Identity | ~100 | **KEEP** |
| James — Context & Preferences | ~250 | **KEEP** |
| Active Projects | ~200 | **KEEP** — but trim to project name + one-line status only |
| Infrastructure Baseline | ~150 | **MOVE** → already in `skills/infrastructure/SKILL.md` (verify + merge) |
| Lessons Learned | ~300 | **MOVE** → new skill or merge into relevant existing skills |
| Open Questions | ~80 | **KEEP** |

**Lessons Learned disposition:** Each lesson belongs in the skill it relates to. "netplan doesn't manage USB WiFi" → infrastructure skill. "OpenClaw doesn't support custom search via openclaw.json" → stack-guidance skill. "Qwen3 thinking adds latency" → ollama skill. Distribute, don't centralize.

---

## Skill Description Writing Guide

From the deep research: OpenClaw's skill activation is pure LLM inference on the frontmatter description. This is the single highest-leverage optimization.

### Rules for writing descriptions:

1. **Include trigger phrases the user actually types.** Not "handles email" but "send email, check inbox, search messages, compose reply."
2. **Specify when NOT to use.** "For scheduling meetings (NOT for checking availability)."
3. **Write like you're telling a coworker in chat.** Simple nouns: "curl commands for SearXNG search on CEG."
4. **Front-load the most common trigger.** The model weights early tokens in the description.
5. **Be specific about the context.** "When Zuberi needs to..." not "A skill for..."

### Example — bad vs good:

**Bad:** `description: "Email skill for Zuberi"`

**Good:** `description: "When Zuberi needs to send email, check inbox, read messages, or search mail. Covers AgenticMail API on CEG:3100 — inbox queries, message reading, email composition, and search. Use for any email-related task. Sending requires CONFIRM."`

### Verify existing skill descriptions:

Before executing RTL-059, read every existing skill's YAML frontmatter and evaluate whether the description would reliably activate. Rewrite any that are vague. This is part of the implementation, not a separate task.

---

## Execution Order

**Do NOT attempt all phases in one ccode prompt.** This is a multi-prompt sequence.

### Prompt 1: Audit existing skills
- Read every SKILL.md in `skills/` directory
- Report: skill name, frontmatter description (verbatim), whether it contains operational details (curl commands, endpoints, etc.)
- Identify gaps: which TOOLS.md sections have NO corresponding skill

### Prompt 2: Create new skills
- Create `skills/dispatch/SKILL.md`, `skills/usage-tracking/SKILL.md`, `skills/stack-guidance/SKILL.md`, `skills/error-recovery/SKILL.md`, `skills/capability-awareness/SKILL.md`
- Each with proper YAML frontmatter (name, description following the writing guide above)
- Content migrated from TOOLS.md and AGENTS.md sections
- Merge ZuberiChat dev context into stack-guidance

### Prompt 3: Rewrite TOOLS.md
- Back up TOOLS.md to TOOLS.md.bak3
- Rewrite as capability index (~500 tokens)
- Keep: architecture, core tools, disciplines, tool use patterns, confirm/proceed, "Available Tool Skills" index
- Remove: all Quick Tool Commands, API Usage Tracking, Sub-Agent details, Vision Tool, Trading Infrastructure, Stack Guidance
- Version bump to 1.0.0

### Prompt 4: Trim AGENTS.md
- Back up AGENTS.md to AGENTS.md.bak3
- Remove: §7 (ZuberiChat Dev Context), §12 (Error Recovery), §13 (Capability Awareness Rule)
- Trim version history to last 3 entries
- Renumber remaining sections
- Version bump to 1.0.0

### Prompt 5: Trim MEMORY.md
- Back up MEMORY.md to MEMORY.md.bak3
- Remove: Infrastructure Baseline section
- Distribute Lessons Learned entries to relevant skills
- Trim Active Projects to name + one-line status
- Version bump to 1.0.0

### Prompt 6: Verify and measure
- Count tokens for all root files (bytes / 4 estimate)
- Confirm total is under 5,000
- Read each new skill to confirm completeness
- Verify no operational detail was lost (every curl command, endpoint, and procedure from the old TOOLS.md exists somewhere in a skill)
- Test: ask Zuberi to do a web search, check email, dispatch to ccode — confirm she loads the right skill each time

---

## Risk Mitigation

### What could go wrong:

1. **Skill descriptions don't activate reliably.** Zuberi doesn't load a skill when she should, losing access to operational details she needs.
   - **Mitigation:** Prompt 1 audits all descriptions. Prompt 6 tests activation. If a skill fails to activate, rewrite its description with more specific trigger phrases.
   - **Fallback:** TOOLS.md includes an "Available Tool Skills" index that names every skill. Even if auto-activation fails, Zuberi can manually load a skill she sees listed.

2. **Content lost in migration.** A curl command or operational detail exists in TOOLS.md but doesn't make it to any skill.
   - **Mitigation:** Prompt 6 explicitly verifies every piece of operational content from old TOOLS.md exists in a skill.
   - **Fallback:** TOOLS.md.bak3 preserves the original. Can restore any section.

3. **Root files too lean — Zuberi loses orientation.** She doesn't know what tools she has because root files don't mention them.
   - **Mitigation:** TOOLS.md keeps the "Available Tool Skills" index — a simple list of skill names with one-line descriptions. She always knows what's available; she just loads details on demand.

4. **OpenClaw doesn't inject all root .md files.** The docs say AGENTS.md, SOUL.md, TOOLS.md are the three documented injected files. Other root .md files (MEMORY.md, IDENTITY.md, USER.md) may or may not be auto-injected.
   - **Mitigation:** This is an existing uncertainty, not new to RTL-059. If a file isn't being injected, moving content out of it doesn't change behavior. Test after implementation.
   - **Action item:** Verify which root files are actually injected by OpenClaw. Check openclaw.json for any explicit file list configuration.

---

## Token Budget After Implementation (Projected)

| File | Current | Target | Method |
|------|---------|--------|--------|
| TOOLS.md | 3,239 | ~500 | Rewrite as capability index |
| AGENTS.md | 2,319 | ~1,500 | Remove §7, §12, §13, trim history |
| SOUL.md | 1,451 | 1,451 | No change |
| MEMORY.md | 1,382 | ~900 | Remove infra baseline, distribute lessons, trim projects |
| USER.md | 785 | 785 | No change |
| IDENTITY.md | 461 | 461 | No change |
| **Total** | **~9,637** | **~5,597** | **42% reduction** |

If TOOLS.md achieves 500 tokens and AGENTS.md hits 1,300, total drops to ~5,397 — within the 5,000 target zone. Further trimming of MEMORY.md's Active Projects section (to name + one-line only) could push below 5,000.

---

## New Skills Created by RTL-059

| Skill | Source | Estimated Tokens |
|-------|--------|-----------------|
| dispatch | TOOLS.md §Sub-Agent | ~300 |
| usage-tracking | TOOLS.md §API Usage Tracking | ~250 |
| stack-guidance | TOOLS.md §Stack Guidance + AGENTS.md §7 | ~400 |
| error-recovery | AGENTS.md §12 | ~200 |
| capability-awareness | AGENTS.md §13 | ~250 |

Total new skill files: 5. Total workspace skills after: 16 (well under the 50-skill phase transition threshold).

---

## Nomenclature Reminder

Use these terms consistently in all skill files and root file rewrites:

| Term | Meaning |
|------|---------|
| **Zuberi** | The whole agent |
| **OpenClaw** | Zuberi's brain |
| **Skills** | Zuberi's knowledge |
| **Tools** | Things Zuberi uses (SearXNG, CXDB, etc.) |
| **Sub-agents** | Independent workers Zuberi delegates to |
| **Disciplines** | Zuberi's specializations (gpt-oss:20b, qwen2.5-coder:14b, qwen3-vl:8b) |

---

## Relationship to Phase Enlightenment

RTL-059 is an infrastructure task in Phase 4 (Mission Launch). But it directly enables **Jeremiel** (Phase Enlightenment) by changing how Zuberi's knowledge is structured. When TOOLS.md no longer describes her own infrastructure as an external system to be managed, and instead her root files carry only her core identity and universal policies, the boundary between "Zuberi's self" and "Zuberi's work" becomes clearer.

The streamline doesn't implement Jeremiel. But it removes the structural barrier to Jeremiel happening naturally.

---

## Definition of Done

- [ ] All root files total under 5,000 tokens
- [ ] TOOLS.md is a capability index under 600 tokens
- [ ] Every curl command, endpoint, and operational detail from old TOOLS.md exists in a skill file
- [ ] 5 new skills created with proper YAML frontmatter descriptions
- [ ] All existing skill descriptions audited and rewritten if vague
- [ ] Zuberi can successfully: web search, check email, dispatch to ccode, check usage — loading the correct skill each time
- [ ] Backups of all modified files (.bak3)
- [ ] CCODE-HANDOFF.md updated
- [ ] Project reference and handoff updated with new file versions

---

## Reference Documents

| Document | Location | Purpose |
|----------|----------|---------|
| Deep research report | deep-research-report_Streamline.md (project files) | Empirical evidence and best practices |
| Current TOOLS.md | C:\Users\PLUTO\openclaw_workspace\TOOLS.md (v0.9.0) | Source for migration |
| Current AGENTS.md | C:\Users\PLUTO\openclaw_workspace\AGENTS.md (v0.9.0) | Source for migration |
| Current MEMORY.md | C:\Users\PLUTO\openclaw_workspace\MEMORY.md (v0.8.0) | Source for migration |
| TOOLS.md redacted copy | TOOLS-REDACTED.md (project files) | Reference without secrets |
| OpenClaw skills docs | https://docs.openclaw.ai/tools/skills | Skill format reference |
| This guide | RTL-059-IMPLEMENTATION-GUIDE.md | Implementation plan |

---
*This guide is self-contained. An architect with access to the workspace files and this document can execute RTL-059 without additional context.*
