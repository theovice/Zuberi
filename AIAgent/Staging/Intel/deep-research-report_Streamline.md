# Lean instructions, sharp agents: organizing OpenClaw workspaces for minimal context burn

**The single most important finding: every token in your root files competes with Zuberi's ability to think.** Your 9,600-token root file footprint consumes ~7.3% of your 131K window — within the 5–15% range practitioners recommend — but the effective context of most local models is only **50–65% of the advertised window**, meaning your root files likely consume 11–15% of *usable* context. Trimming TOOLS.md from ~3,200 tokens to a ~500-token index could reclaim **2,700 tokens per turn** while actually improving instruction-following quality, because empirical research shows that instruction compliance degrades exponentially with instruction count. The architecture you're reaching for — Unix-philosophy modularity with on-demand skill loading — is exactly what Anthropic, OpenAI, and the broader agent-building community have converged on as the scaling pattern that works.

---

## The root-vs-skill decision comes down to one question

The decision framework across OpenClaw, Claude Code, Cursor, Windsurf, and Aider has converged on a single test: **does the agent need this information on every single turn, regardless of what the user says?** If yes, it belongs in a root file. If it depends on context, it belongs in a skill.

OpenClaw's workspace kernel — SOUL.md, AGENTS.md, IDENTITY.md, USER.md, TOOLS.md, HEARTBEAT.md, and MEMORY.md — loads before any conversation begins. Skills, by contrast, exist as compact XML entries in the system prompt (just name, description, and file path — roughly **24 tokens per skill** plus field content). The agent scans these descriptions each turn, selects at most one match, then reads the full SKILL.md via the `read` tool. This progressive disclosure architecture means skill *bodies* cost zero tokens until activated.

The community pattern across all comparable systems reinforces the same split:

- **Root files hold identity, safety constraints, universal policies, and capability indexes.** Claude Code's CLAUDE.md best practice is under 60 lines — HumanLayer's production CLAUDE.md achieves this. Cursor's "Always Apply" rules cover only project-wide standards. Windsurf caps combined always-on rules at 12,000 characters. AIHero's AGENTS.md guide recommends the absolute minimum root: a one-sentence project description plus package manager, with everything else delegated.

- **Skills hold domain-specific workflows, tool-specific operational details, and task-specific playbooks.** OpenClaw's official guidance is explicit: "These are the only fields that Codex reads to determine when the skill gets used" — referring to the YAML frontmatter `name` and `description`. The body of SKILL.md is never seen until after activation. Anthropic's Agent Skills documentation describes this as a "three-tier disclosure architecture keeping metadata costs under 100 tokens while making skill capacity effectively unbounded."

For your TOOLS.md specifically, the implication is clear. A root-level tools file should carry only what Zuberi needs to know *before* any specific tool is relevant: tool names, one-line descriptions of what each does, and perhaps critical safety constraints (e.g., "never run destructive commands without confirmation"). The operational details — parameter formats, usage examples, error handling, edge cases — belong in the skill file for each tool, loaded only when that tool becomes relevant.

---

## Token budgets have hard ceilings that matter more than window size

The most actionable numbers from across the research:

| Context component | Recommended share | Your 131K budget |
|---|---|---|
| System instructions (root files) | **5–10%** | 6,550–13,100 tokens |
| Tool/skill metadata | ~150 tokens per tool | Scales with tool count |
| Conversation history | 20–30% | 26,200–39,300 tokens |
| Working memory + output | Model-dependent | Reserve 15–20% |
| Buffer for unexpected expansion | 10–15% | 13,100–19,650 tokens |

But these percentages assume the full 131K is usable. **It isn't.** The RULER benchmark found that of models claiming 32K+ context, only half maintained satisfactory performance at 32K. Red Hat's testing of an 8B-parameter model with a 128K claimed window found effective performance at ~32K. For Ollama-hosted models, the effective context is likely **65K–85K tokens** — making your 9,600-token root footprint closer to 12–15% of usable capacity.

The practitioner sweet spot for system prompt length is **500–2,000 tokens** for maximum accuracy and response quality. Particula Tech's systematic testing found GPT-4 accuracy stable to ~4,000 tokens then dropping 12% by 6,000; Claude maintaining until ~5,500. The "Same Task, More Tokens" paper (Levy, Jacoby & Goldberg, ACL 2024) demonstrated **reasoning degradation beginning at just 3,000 tokens** — not from hitting a wall, but from irrelevant information consuming finite attention budget.

The key insight: **bigger context windows do not justify bigger system prompts.** The 5–10% guideline applies even at 1M tokens. A 200K model with clean, compacted context consistently outperforms a 2M model drowning in noise on production benchmarks. Your goal should be minimizing root file tokens while preserving all essential information — not filling available space.

---

## Skill descriptions are routing hooks, and writing them well is a craft

OpenClaw's skill activation is pure LLM inference — no regex, no keyword matching. The model's forward pass through the transformer decides whether a skill is relevant based solely on the description field in YAML frontmatter. This makes description quality the single highest-leverage optimization for skill reliability.

The official OpenClaw skill-creator guidance is specific: "Include both what the Skill does and specific triggers/contexts for when to use it. Include all 'when to use' information here — Not in the body." Community practitioners reinforce this with concrete patterns:

- **Bad description**: "A skill for handling emails"
- **Good description**: "When user asks to format an email or write a professional message, structure it with corporate standards including proper greeting, body paragraphs, and signature"

The LumaDock guide recommends writing descriptions "like I'm describing the task to a coworker in chat. Simple words: 'log summary' / 'deploy checklist' / 'ClawHub install' / 'SKILL.md template.'" Use the nouns users actually type. Be specific about trigger contexts. Think of each description as a **routing hook** — if it's vague, the route fails.

For fallback when skills are missed, OpenClaw's constraint of "never read more than one skill up front" means a missed activation means the agent proceeds without the skill's guidance entirely. Mitigation patterns from the broader community include adding explicit routing hints in root files ("for calendar operations, check the calendar-manager skill"), using evaluation-driven improvement to track which skills get missed and refining their descriptions, and — if a critical capability must never be missed — setting `metadata.openclaw.always: true` to force-include it. But each forced inclusion adds to root file token cost, so this should be reserved for genuinely critical skills.

---

## What well-designed root files actually look like

The pattern across mature OpenClaw workspaces, Claude Code configurations, and AGENTS.md best practices converges on a minimalist root architecture that **points rather than explains**:

**TOOLS.md as an index, not a manual.** Your current TOOLS.md at ~3,200 tokens duplicates operational details already in skill files. The refactored version should be a capability index — roughly 500–800 tokens listing each tool with a one-line description and any universal safety constraints. Think of it as a table of contents, not the chapters themselves. Each tool's operational details, parameters, examples, and edge cases belong in that tool's SKILL.md, loaded only when relevant.

**SOUL.md as a constitution, not a rulebook.** The community reference repo (criticalberne/openclaw-reference) demonstrates a SOUL.md focused on personality, values, and communication style — not operational procedures. Specific behavioral rules ("max 5 bullet points, confirm before any file deletion") dramatically outperform vague directives ("be helpful").

**AGENTS.md for operational constraints only.** Memory management rules, safety boundaries, group chat etiquette, escalation policies. Not tool usage instructions.

**USER.md for persistent user context.** Name, timezone, preferences, ongoing projects. Updated as context evolves, not as a dumping ground for session-specific details.

The Claude Code community has arrived at a parallel pattern. GitHub's analysis of 2,500+ repositories found six core areas for effective root files: commands, testing instructions, project structure, code style conventions, git workflow, and boundaries. Everything else — framework-specific patterns, deployment procedures, API integration details — goes into on-demand files. The most effective CLAUDE.md files are **under 60 lines**, with some power users maintaining files under 30 lines by aggressively delegating to skills.

A practical template for your refactored TOOLS.md might look like:

```markdown
# Available Tools
Tools are available for: [one-line per tool category]
- File operations (read, write, ls, glob)
- Shell commands (bash execution)  
- Web access (fetch, search)
- Memory management (read/write memory files)

## Safety Rules (apply to ALL tool use)
- Never delete files without explicit confirmation
- Never execute destructive shell commands without preview
- [any other universal constraints]

## Tool-Specific Details
Operational details for each tool are in the corresponding skill file.
Load the relevant skill before using unfamiliar tool parameters.
```

This compresses ~3,200 tokens to ~300–500, pushing every tool-specific operational detail into on-demand skills where it belongs.

---

## Scaling past 50 skills requires hierarchical routing

The most rigorous evidence on skill scaling comes from the paper "When Single-Agent with Skills Replace Multi-Agent Systems and When They Fail" (arXiv:2601.04748), which identified a **phase transition at κ ≈ 50–100 skills** for GPT-class models. Below this threshold, flat selection (the model scanning all skill descriptions and picking one) works well at ~85% accuracy. Above it, accuracy degrades to 45–63%. The root cause is **semantic confusability** — as skills multiply, their descriptions overlap, and the model struggles to differentiate.

Anthropic's internal experience validates this at scale. A five-MCP-server setup consumed **~55K tokens in tool definitions alone** before any conversation — and Anthropic's own internal tools hit 134K tokens before optimization. Their solution was the Tool Search Tool, which reduced upfront token cost by **85%** (from ~72K to ~500 tokens) while improving selection accuracy from 49% to 74% for Opus 4.

For OpenClaw workspaces approaching the 50-skill threshold, the proven patterns are:

- **Hierarchical skill grouping**: Organize skills into semantic clusters (e.g., `skills/communication/`, `skills/devops/`, `skills/research/`). This naturally reduces within-cluster confusability.
- **Meta-skills that route to sub-skills**: A top-level "communication" skill whose body references specific sub-skills for email, Slack, SMS. The model first selects the meta-category, then drills into the specific skill.
- **Description deconfusion**: When two skills have overlapping descriptions, differentiate them by specifying what each does NOT do, not just what it does. "For scheduling meetings (NOT for checking calendar availability)" vs. "For checking calendar availability (NOT for scheduling)."
- **Pruning and disabling**: OpenClaw supports `skills.allowBundled` to limit eligible bundled skills. Disable skills you rarely use — every eligible skill adds ~24+ tokens to every turn's system prompt.

OpenAI's official guidance is blunt: "Aim for fewer than 20 functions available at the start of a turn at any one time." For larger libraries, use a tool search mechanism to defer infrequently used tools. This maps directly to OpenClaw's architecture — keep your workspace skills directory lean, and use ClawHub's installed skills selectively.

---

## Instruction overload measurably degrades model intelligence

The "foggy model" problem is not subjective — it is one of the best-documented phenomena in LLM research. Three distinct mechanisms cause it, and all have been quantified.

**Mechanism 1: Positional attention bias ("lost in the middle").** The landmark Liu et al. paper (TACL 2024) demonstrated a U-shaped attention curve across every tested model: information at the beginning and end of context gets significantly more attention than information in the middle. The Chroma "Context Rot" study (2025) confirmed this across **18 frontier models** including GPT-4.1, Claude 4, and Gemini 2.5, finding performance degrades at every context length increment — not just near the limit. Moving information from the middle to the edges improved response quality by up to **30%** in Anthropic's own testing.

**Mechanism 2: Exponential instruction-following decay ("curse of instructions").** The ManyIFEval benchmark (ICLR 2025) proved mathematically that the probability of following ALL instructions follows **P(all) = P(individual)^n**. At 10 simultaneous instructions, GPT-4o's all-follow rate drops to **15%**; Claude 3.5 Sonnet to **44%**. The IFScale benchmark (NeurIPS 2025) tested up to 500 instructions and found even reasoning models like o3 maintain near-perfect compliance only until ~150 instructions before steep decline. Crucially, degradation is **uniform** — it doesn't just affect new instructions, it degrades compliance with ALL instructions including ones the model previously followed perfectly.

**Mechanism 3: Reasoning degradation from input length alone.** Levy, Jacoby & Goldberg (ACL 2024) isolated input length as a variable while keeping the reasoning task identical. **Reasoning performance degraded starting at ~3,000 tokens** — from padding with irrelevant text, whitespace, or even semantically similar distractors. Chain-of-thought prompting did not mitigate this effect.

The practical implication for your workspace: your 9,600-token root file payload is above the ~3,000-token threshold where reasoning degradation begins and approaching the ~4,000-token zone where Particula Tech measured active accuracy drops of 12%. Every token you remove from always-loaded files doesn't just save context space — it measurably improves the quality of Zuberi's reasoning on the tokens that remain.

---

## Conclusion: the minimal viable kernel

The research converges on a clear architectural principle: **treat root files as a kernel and skills as dynamically loaded modules**. Your instinct to apply Unix philosophy — "organized English in folders, loaded at the right moment" — is validated by every major agent platform's evolution toward progressive disclosure.

For your specific situation, the highest-impact action is refactoring TOOLS.md from a ~3,200-token operational manual to a ~500-token capability index, pushing tool-specific details into on-demand skills. This single change reclaims ~2,700 tokens/turn — a **28% reduction** in root file overhead — while likely *improving* instruction-following reliability by reducing the instruction count Zuberi must track simultaneously.

The broader framework: aim for root files totaling **under 5,000 tokens** (roughly 4% of your 131K window, or 6–8% of effective context). Each root file should pass the "every turn" test — if there's any turn where this information isn't needed, it belongs in a skill. Write skill descriptions as routing hooks with specific trigger phrases. Monitor skill count; if you approach 50+ skills, introduce hierarchical grouping. And remember that the research is unambiguous: **clarity beats length, always**. A lean 3,000-token root payload that Zuberi follows perfectly outperforms a comprehensive 10,000-token payload where critical instructions get lost in the middle.