# Ccode Prompt: Model Router Skill + Ollama GPU Fix

## Context
Zuberi needs autonomous model selection. OpenClaw's fallback system only triggers on provider failures — it cannot route to different models based on task type. Zuberi must decide for itself when to delegate sub-tasks to specialist models via exec/curl to Ollama's API.

Workspace: `C:\Users\PLUTO\openclaw_workspace\`
Ollama endpoint (from inside OpenClaw container): `http://host.docker.internal:11434`
GPU: RTX 5070 Ti 16GB VRAM

Kill any existing pnpm tauri dev process before starting work.

## Task 1: Create skills/model-router/SKILL.md

Create the file `C:\Users\PLUTO\openclaw_workspace\skills\model-router\SKILL.md` with exactly this content:

---
name: model-router
description: Select the optimal model for a task. Use BEFORE executing any complex task to determine if a specialist model would produce better results than the default qwen3:14b-fast.
---

# Autonomous Model Selection

You have access to multiple models via Ollama on KILO. Your default inference runs on qwen3:14b-fast, but you can delegate sub-tasks to specialist models by calling the Ollama API directly.

## Available Models

| Model | ID | Size | Strengths | Latency |
|-------|-----|------|-----------|---------|
| **Fast General** | qwen3:14b-fast | 9.3GB | Conversation, planning, writing, code review, quick answers. Thinking disabled. | ~1-2s |
| **Deep Thinker** | qwen3:14b | 9.3GB | Multi-step reasoning, complex analysis, math, architecture decisions, logic chains. Full thinking/chain-of-thought enabled. | ~6-11s |
| **Vision** | qwen3-vl:8b | 5.7GB | Image analysis, OCR, chart/table parsing, UI screenshots, document reading, scene description. | ~3-5s swap + inference |
| **Large General** | gpt-oss:20b | 13GB | Fallback for tasks needing larger context or different training data. May partially CPU-offload. | Variable |

## Decision Rules

### Stay on qwen3:14b-fast (default — do not delegate) when:
- Simple conversation, greetings, status updates
- Writing first drafts of documents, emails, plans
- Quick code review or small edits
- Summarizing information you already have
- Managing tasks, creating kanban cards, listing workflows
- Any task where speed matters more than depth

### Delegate to qwen3:14b (deep thinker) when:
- The task explicitly asks to "think carefully", "analyze deeply", or "reason through"
- Multi-step math, logic proofs, or formal verification
- Complex system architecture decisions with tradeoffs
- Debugging subtle code issues that require step-by-step reasoning
- Strategic business analysis with multiple competing factors
- Any task where you are uncertain of your first answer

### Delegate to qwen3-vl:8b (vision) when:
- Any image is present in the conversation or workspace
- User asks to "look at", "read", "describe", or "extract from" an image
- OCR of documents, invoices, screenshots
- Chart or table parsing from visual data
- UI analysis or design review from screenshots

### Delegate to gpt-oss:20b (large) when:
- qwen3:14b-fast produces unsatisfactory results on a general task
- The task benefits from a different model's training perspective
- You need a second opinion on a complex decision

## How to Delegate

### For deep reasoning (qwen3:14b):
```bash
curl -s http://host.docker.internal:11434/api/chat -d '{
  "model": "qwen3:14b",
  "messages": [{"role": "user", "content": "YOUR_DETAILED_PROMPT_HERE"}],
  "stream": false,
  "options": {"num_predict": 4096}
}'
```

### For vision (qwen3-vl:8b):
```bash
curl -s http://host.docker.internal:11434/api/chat -d '{
  "model": "qwen3-vl:8b",
  "messages": [{"role": "user", "content": "YOUR_PROMPT", "images": ["BASE64_IMAGE"]}],
  "stream": false,
  "options": {"num_predict": 2048}
}'
```

### For large general (gpt-oss:20b):
```bash
curl -s http://host.docker.internal:11434/api/chat -d '{
  "model": "gpt-oss:20b",
  "messages": [{"role": "user", "content": "YOUR_PROMPT"}],
  "stream": false,
  "options": {"num_predict": 4096}
}'
```

## Delegation Pattern

1. **Detect** — Before executing a complex task, evaluate against the Decision Rules above
2. **Announce** — Tell James which model you are delegating to and why: "This requires deep reasoning — delegating to qwen3:14b (thinking enabled)."
3. **Delegate** — Send a focused, complete prompt to the specialist model via exec/curl. Include all necessary context — the specialist has no memory of your conversation.
4. **Interpret** — Read the specialist's response. Summarize or integrate it into your response to James. Do NOT dump raw model output.
5. **Return** — Continue on qwen3:14b-fast for the rest of the conversation. The specialist model will auto-unload after idle timeout.

## GPU Behavior

- RTX 5070 Ti: 16GB VRAM
- Only one model loaded at a time — Ollama handles swapping
- Model swap takes ~3-5 seconds (loading from SSD to VRAM)
- After delegation, qwen3:14b-fast auto-reloads on your next inference turn
- For batch vision tasks, keep qwen3-vl:8b loaded by sending multiple requests without returning to conversation

## Important

- You are ALWAYS running on qwen3:14b-fast as your primary brain. Delegation does not change YOUR model — it calls a specialist and brings back the result.
- Delegation costs time (~3-5s for model swap). Do not delegate trivial tasks.
- The specialist model has NO context from your conversation. Your delegation prompt must be self-contained.
- Parse responses with grep/sed if needed — no jq available.
- If a delegation call fails, fall back to handling the task yourself on qwen3:14b-fast.
- Log every delegation in your response so James can audit model selection decisions.

## Task 2: Update Ollama skill — fix GPU references

Open `C:\Users\PLUTO\openclaw_workspace\skills\ollama\SKILL.md`.

Make these three replacements:

Find: `**GPU**: NVIDIA RTX 3060 12GB VRAM`
Replace with: `**GPU**: NVIDIA RTX 5070 Ti 16GB VRAM`

Find: `Only one large model can be loaded in VRAM at a time (12GB limit)`
Replace with: `Only one large model can be loaded in VRAM at a time (16GB limit)`

Find: `Must fit in 12GB VRAM (prefer Q4_K_M quant under 9GB for full GPU offload)`
Replace with: `Must fit in 16GB VRAM (prefer Q4_K_M quant under 12GB for full GPU offload)`

## Task 3: Update TOOLS.md — add model-router to skill references

Open `C:\Users\PLUTO\openclaw_workspace\TOOLS.md`.

Find the line that starts with `For detailed skill instructions, read:` and append `, `skills/model-router/SKILL.md`` to the end of that line.

Read the current version number at the top of TOOLS.md. Increment the patch version by one. Add to the version history table:

```
| NEW_VERSION | 2026-03-02 | Model router skill added for autonomous model selection. Ollama skill GPU corrected to RTX 5070 Ti 16GB. |
```

## Task 4: Verify

Confirm these files exist and have the expected content:
- `C:\Users\PLUTO\openclaw_workspace\skills\model-router\SKILL.md`
- `C:\Users\PLUTO\openclaw_workspace\skills\ollama\SKILL.md` (check GPU references updated)
- `C:\Users\PLUTO\openclaw_workspace\TOOLS.md` (check skill reference line and version)

## Important notes
- Do NOT use jq anywhere.
- Do NOT modify openclaw.json — model routing is handled at skill level, not config level.
- Do NOT modify AGENTS.md or SOUL.md.
- Do NOT copy files to OneDrive or any location outside the workspace.
- The model-router skill is READ by Zuberi during task execution. It contains decision logic, not executable code.
