# The Workspace Streamline: How to Make Your AI Agent Think Sharper by Loading Less

A practical guide for anyone running a local AI assistant — OpenClaw, Claude Code, Cursor, Windsurf, or any file-based agent system.

---

## The Problem

Your AI agent reads instruction files before every conversation turn. These files tell it who it is, what it can do, how to behave, and what tools it has. The more you put in these files, the less room the agent has to actually think.

This isn't a metaphor. It's a measured, documented phenomenon:

- **Reasoning degrades starting at ~3,000 tokens of system instructions.** The "Same Task, More Tokens" paper (Levy, Jacoby & Goldberg, ACL 2024) proved that irrelevant information in context degrades reasoning — not from hitting a wall, but from consuming finite attention budget.

- **Instruction compliance decays exponentially.** The ManyIFEval benchmark (ICLR 2025) proved that the probability of following ALL instructions follows P(all) = P(individual)^n. At 10 simultaneous instructions, GPT-4o drops to 15% all-follow rate. Fewer always-loaded instructions = higher compliance with the ones that remain.

- **Effective context is 50–65% of advertised window.** A model claiming 128K context likely performs well on only 65K–85K tokens. Your always-loaded files consume a bigger share of usable context than you think.

- **Bigger context windows don't justify bigger system prompts.** The 5–10% guideline for system instructions applies even at 1M tokens. A 200K model with clean context consistently outperforms a 2M model drowning in noise.

The bottom line: every token in your always-loaded files competes with your agent's ability to think. Loading everything at once makes it foggy. Loading the right file at the right moment keeps it sharp.

---

## The Principle

**Treat always-loaded files as a kernel and on-demand files as dynamically loaded modules.**

This is the Unix philosophy applied to AI agents: small files that do one thing, composed as needed. Your agent's core identity, safety rules, and universal policies load every turn. Everything else loads only when the task calls for it.

The decision framework is one question: **does the agent need this information on every single turn, regardless of what the user says?**

- If yes → it belongs in an always-loaded file (root file, system prompt, rules file)
- If it depends on context → it belongs in an on-demand file (skill, plugin, reference doc)

---

## The Architecture

### Always-loaded files (the kernel)

These load on every turn. They should be as lean as possible. Target: **under 5,000 tokens total** for the entire set. What belongs here:

- **Identity** — who the agent is, its name, personality, voice. A constitution, not a rulebook. Think values and character, not procedures.

- **Safety and autonomy rules** — what the agent can do autonomously, what requires confirmation, what it must never do. Universal policies that apply regardless of task.

- **Capability index** — a list of what the agent can do, with one-line descriptions. Not how to do it — just what's available. Think table of contents, not the chapters.

- **User context** — who the user is, their preferences, communication style. Enough for the agent to be personalized, not a detailed dossier.

- **Universal workflow patterns** — decision frameworks that apply to every task (e.g., "read before writing," "confirm before destructive actions").

What does NOT belong here:

- Tool-specific API endpoints, parameters, curl commands
- Error recovery procedures for specific services
- Development context for specific projects
- Infrastructure details (server specs, port numbers, service URLs)
- Historical lessons learned (distribute to relevant on-demand files)
- Detailed project status or documentation
- Disabled features

### On-demand files (the modules)

These load only when the agent decides they're relevant. They cost zero tokens until activated. What belongs here:

- **Tool-specific operational details** — the actual API endpoints, parameters, authentication, error handling, and usage examples for each tool
- **Domain-specific workflows** — how to do email, how to search, how to deploy, how to run tests
- **Project-specific context** — repository conventions, tech stack details, deployment procedures
- **Error recovery procedures** — what to do when specific services fail
- **Reference material** — infrastructure specs, historical decisions, lesson libraries

---

## How to Streamline: Step by Step

### Step 1: Measure what you have

Count the tokens in every always-loaded file. A rough estimate: **bytes ÷ 4 ≈ tokens**.

Create a table:

| File | Bytes | ~Tokens | Purpose |
|------|-------|---------|---------|
| (your files) | | | |
| **Total** | | | |

If your total is under 3,000 tokens, you're already lean. If it's over 5,000, there's significant room to improve. Over 8,000 and your agent is measurably impaired.

### Step 2: Apply the "every turn" test

For each section in each always-loaded file, ask: does the agent need this on literally every turn?

- API endpoints for a search tool? Only needed when searching. → Move to on-demand.
- "Never delete files without confirmation"? Needed every turn. → Keep.
- Error recovery steps for when a database is offline? Only needed during errors. → Move to on-demand.
- The agent's name and personality? Every turn. → Keep.
- Infrastructure specs (CPU, RAM, disk)? Only needed when troubleshooting. → Move to on-demand.

### Step 3: Identify where on-demand content will live

For most agent frameworks, on-demand files are organized as skills, plugins, or reference documents in a specific directory. The key mechanism is progressive disclosure:

1. The framework reads file names and short descriptions at startup
2. Descriptions are included in the system prompt (very cheap — ~24 tokens per file)
3. The agent decides per-turn whether to load the full file
4. Full content only loads when activated

If your framework doesn't have a native skill/plugin system, you can achieve the same effect by instructing the agent in its always-loaded rules: "Before doing X, read the reference file at [path]."

### Step 4: Create the on-demand files

For each section you're moving out:

1. Create a file in the on-demand directory
2. Include a clear name and description (this is what triggers activation)
3. Move the full operational content from the always-loaded file into this new file
4. Verify nothing was lost — every command, endpoint, and procedure must exist somewhere

### Step 5: Rewrite the always-loaded file as an index

Replace detailed operational sections with a simple reference list:

**Before (in always-loaded file):**
```
## Email Tool
To check inbox:
  curl -s -H "Authorization: Bearer TOKEN" http://server:3100/api/mail/inbox
To send email (CONFIRM REQUIRED):
  curl -s -X POST -H "Authorization: Bearer TOKEN" http://server:3100/api/mail/send
  -d '{"to":"recipient","subject":"Subject","text":"Body"}'
To search:
  curl -s -X POST http://server:3100/api/mail/search -d '{"query":"terms"}'
```

**After (in always-loaded file):**
```
## Available Skills
| Skill | Purpose |
|-------|---------|
| email | Send, receive, search email |
| search | Web search |
| database | Read/write persistent memory |
```

The operational details now live in the email skill file, loaded only when the agent needs to send email.

### Step 6: Write good activation descriptions

If your framework uses descriptions to decide when to load on-demand files, the description is the single highest-leverage optimization. Write them like you're telling a coworker in chat what the file is for:

**Bad:** `"Email skill"`

**Good:** `"When you need to send email, check inbox, read messages, or search mail. Covers inbox queries, message reading, composition, and search. Use for any email task."`

Rules for good descriptions:
- Include the trigger phrases users actually type ("send email," "check inbox")
- Specify when NOT to use it to avoid false activations
- Front-load the most common trigger — early tokens get more attention
- Be specific about what the file contains ("curl commands for X," "error recovery for Y")

### Step 7: Verify and measure

After streamlining:
1. Re-measure all always-loaded files — confirm total is under 5,000 tokens
2. Verify every operational detail from the old files exists in an on-demand file
3. Test each capability — confirm the agent loads the right on-demand file for each task
4. If an on-demand file fails to activate, rewrite its description with more specific triggers

---

## Token Budget Guidelines

| Context component | Recommended share |
|---|---|
| Always-loaded instructions | **5–10%** of context window |
| On-demand file metadata (names + descriptions) | ~24 tokens per file |
| Conversation history | 20–30% |
| Working memory + output | 15–20% |
| Buffer | 10–15% |

For a 128K context model, that means always-loaded files should be **6,400–12,800 tokens**. But since effective context is only 50–65% of the advertised window, aim for the low end: **under 5,000 tokens**.

The practitioner sweet spot for system prompt length is **500–2,000 tokens** for maximum accuracy and response quality. Accuracy holds stable to ~4,000 tokens, then drops measurably by 6,000.

---

## Scaling: What Happens as Your Agent Grows

As you add more capabilities, the on-demand file count grows. This is fine up to a point:

- **Under 20 files:** Flat structure works perfectly. The agent scans all descriptions and picks the right one ~85% of the time.
- **20–50 files:** Still manageable. Watch for description overlap causing wrong activations.
- **50–100 files:** Accuracy drops to 45–63% with flat selection. Introduce hierarchical grouping — organize files into categories (communication/, devops/, research/).
- **100+ files:** Consider a search mechanism — a meta-file that the agent queries to find the right on-demand file, rather than scanning all descriptions.

When two files have overlapping descriptions, differentiate by specifying what each does NOT do: "For scheduling meetings (NOT for checking availability)" vs. "For checking calendar availability (NOT for scheduling)."

---

## What to Put in Each File Type

### Identity / Soul file (~500–800 tokens)
- Name, personality, communication style
- Core values and philosophy
- Growth arc (if applicable)
- What the agent is NOT

### Rules / Agents file (~1,000–1,500 tokens)
- Autonomy boundaries (can do / must confirm / never do)
- Security posture
- Memory management rules
- Communication style pointers
- Escalation policy

### Tools / Capabilities index (~500–1,000 tokens)
- Architecture overview (one diagram)
- Built-in tool policies (read/write/execute rules)
- List of available on-demand files with one-line descriptions
- Universal workflow patterns
- Confirm-vs-proceed decision table

### User context (~300–500 tokens)
- Name, timezone, preferences
- Working style and communication preferences
- Enough for personalization, not a biography

### On-demand skill files (~200–2,000 tokens each)
- YAML frontmatter with name and description (the activation trigger)
- Full operational details: endpoints, parameters, authentication
- Usage examples
- Error handling and known issues
- Anything the agent needs to perform that specific task

---

## The Trap: Don't Rebuild What You Just Removed

After streamlining, there's a natural tendency to add "just one more thing" to the always-loaded files. Resist it. Every new capability should get an on-demand file, not more lines in the kernel. The whole point is that the kernel stays lean as the agent grows.

The test remains the same: does the agent need this on every single turn? If not, it's an on-demand file.

---

## Quick Reference

| If you see this... | Do this... |
|---|---|
| Always-loaded files over 5,000 tokens | Apply the "every turn" test and move content to on-demand files |
| API endpoints / curl commands in always-loaded files | Move to tool-specific on-demand files |
| Error recovery procedures in always-loaded files | Create an error-recovery on-demand file |
| Project-specific context in always-loaded files | Create a project-specific on-demand file |
| Disabled features still in always-loaded files | Remove entirely or demote to on-demand |
| On-demand file not activating when expected | Rewrite its description with more specific trigger phrases |
| Agent ignoring instructions it used to follow | Check total always-loaded tokens — instruction compliance decays with volume |
| Two on-demand files activating on the same query | Differentiate descriptions by specifying what each does NOT do |

---

## Sources

- Levy, Jacoby & Goldberg, "Same Task, More Tokens" (ACL 2024) — reasoning degradation from input length
- ManyIFEval benchmark (ICLR 2025) — exponential instruction-following decay
- IFScale benchmark (NeurIPS 2025) — instruction compliance at scale
- Liu et al., "Lost in the Middle" (TACL 2024) — positional attention bias
- Chroma "Context Rot" study (2025) — performance degrades at every context length increment
- RULER benchmark — effective vs. advertised context window
- Particula Tech — system prompt length vs. accuracy benchmarks
- OpenClaw, Claude Code, Cursor, Windsurf community best practices

---

*The method is the folder. The instructions are English. The runtime is the agent. Organized English in folders, loaded at the right moment — not all at once. That's a concept from the 1970s. That's called Unix. Everything is a file. Small programs that do one thing. Still running 50 years later.*
