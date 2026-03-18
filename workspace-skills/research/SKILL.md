---
name: research
description: "Structured research methodology. Use when asked to research a topic, investigate an opportunity, gather information from multiple sources, or produce a research report. Activates on: 'research X', 'investigate X', 'what are the options for X', 'learn about X', 'deep dive into X'. NOT for quick factual lookups (use searxng) or reading a single URL (use web-fetch)."
---

# Research Methodology

Structured process for multi-source research. Follow WORK STYLE: one step per turn.

## When to use

- James asks to research a topic, opportunity, or strategy
- A task requires gathering and synthesizing information from 5+ sources
- Producing a written report with citations and recommendations
- Learning a new domain or evaluating options

## Protocol

### Phase 1: Scope (1 turn)

- Confirm the research question with James
- Check MEMORY.md and CXDB for existing knowledge on the topic
- Define 3-5 search queries that cover the topic from different angles
- Report the plan. Wait for go-ahead or adjustments.

### Phase 2: Search (1 turn per query)

- Run one SearXNG query per turn (see searxng skill)
- Capture top 5 URLs with titles and snippets
- Report what you found. Move to next query or Phase 3.

### Phase 3: Read (1 turn per source)

- Fetch one URL per turn using web-fetch skill or browser tool
- Extract key findings: facts, numbers, quotes, methods
- Write a 2-3 sentence summary of what this source contributed
- Report the summary. Move to next source.

### Phase 4: Synthesize (1-2 turns)

- Combine findings into a coherent analysis
- Identify patterns, contradictions, and gaps
- Write the report to docs/research/<topic-slug>.md
- Report completion.

### Phase 5: Store (1 turn)

- Store key findings in CXDB with type "Note" and tag "#research"
- Each finding should be a separate CXDB entry with source URL
- Report what was stored.

### Phase 6: Recommend (1 turn)

- Present top recommendations ranked by feasibility
- Identify what would need to be built vs what exists
- Flag any risks or unknowns
- Ask James for direction on next steps.

## Report format

Write reports to: docs/research/<topic-slug>.md

Structure:

```markdown
# <Title>

Date: YYYY-MM-DD
Status: draft | final

## Summary

2-3 paragraph executive summary.

## Findings

### <Finding 1>

Detail with source citations.

### <Finding 2>

...

## Analysis

Patterns, trade-offs, gaps.

## Recommendations

Ranked list with feasibility assessment.

## Sources

Numbered list of all URLs consulted.
```

## Rules

- ONE step per turn. Never combine search + fetch + synthesize.
- Always cite sources. No unsourced claims.
- Store durable findings in CXDB, not just the report file.
- If a source is paywalled or blocked, skip it and note it.
- If James says "continue", proceed to the next step in the protocol.
- If James says "go deeper on X", add targeted searches for X.
- Rate limit: max 1 fetch per 5 seconds from same domain.

## Tools used

- searxng skill — web search
- web-fetch skill — page extraction
- browser tool — for JS-rendered pages or sites that block curl
- cxdb skill — store findings
- write tool — create report files
