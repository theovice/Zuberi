# Streaming Pipeline Audit — ZuberiChat + gpt-oss:20b Harmony Format
**Date:** 2026-03-12 | Session 19 | Architect 19
**ZuberiChat version at time of audit:** v1.0.14
**Tests at time of audit:** 155/155

---

## 1. gpt-oss:20b Harmony Response Format

gpt-oss:20b does not use `<think>` tags. It uses the OpenAI Harmony response format — a multi-channel token protocol enforced by reinforcement learning. The model emits special control tokens to route output to three channels.

### Channels

| Channel | Token Sequence | Purpose | User-Facing? |
|---------|---------------|---------|-------------|
| analysis | `<\|start\|>assistant<\|channel\|>analysis<\|message\|>` | Internal reasoning, goal decomposition, tool planning | No |
| commentary | `<\|start\|>assistant<\|channel\|>commentary to=functions.{name}` | Tool call JSON payloads, function invocation | No |
| final | `<\|start\|>assistant<\|channel\|>final<\|message\|>` | Curated user-facing answer | Yes |

### Control Tokens

| Token | Purpose |
|-------|---------|
| `<\|start\|>` | Begin message block |
| `<\|end\|>` | End message block |
| `<\|channel\|>` | Declare output channel |
| `<\|message\|>` | Begin message content |
| `<\|constrain\|>` | Constrain output format (e.g., JSON) |
| `<\|return\|>` | End of function return |

These are **special tokens in the model vocabulary**, not plain text. Ollama's tokenizer decodes them as empty strings — they do not appear in the output text.

### Reasoning Parameter

The model accepts a `Reasoning` parameter with three valid values:

| Value | Effect |
|-------|--------|
| `low` | Analysis channel limited to ~20 tokens. Tool calls still work. |
| `medium` | Default. Full analysis trace. |
| `high` | Extended reasoning. |

**Invalid values that are silently ignored (defaults to medium):** `none`, `off`, `false`, `true`. The model does not recognize these and falls back to medium.

The only way to reduce monologue volume without breaking tool calls is `Reasoning: low`. Setting it to `none` or `off` does nothing.

### Why Suppression Via System Prompt Fails

gpt-oss:20b is RL-trained to narrate reasoning as a prerequisite for response generation. Negative constraints ("do not narrate your reasoning") cause one of two failure modes:

- **Meta-monologue:** The model uses the analysis channel to debate whether it's allowed to use the analysis channel, then uses it anyway.
- **Boundary bleed:** The model leaks reasoning directly into the final channel as conversational text, making it harder to detect and filter.

The analysis channel cannot be disabled by prompt engineering. It is structurally mandatory.

### Why Ollama's think Parameter Fails

`think: false` and `--think=false` have no effect on gpt-oss:20b. Ollama's thinking mode expects a boolean toggle. gpt-oss:20b expects `low`/`medium`/`high` as a Harmony parameter. The boolean is discarded as a parsing mismatch and the model defaults to medium.

---

## 2. ZuberiChat Streaming Pipeline Map

Audited from source on 2026-03-12 against ZuberiChat v1.0.14.

### Data Flow

```
Ollama (inference)
  ↓ Native /api/chat streaming
OpenClaw gateway (orchestration)
  ↓ WebSocket events (chat delta/final, agent, exec.approval.*)
useWebSocket.ts (transport)
  ↓ JSON.parse → onMessage callback
ClawdChatInterface.tsx (routing + assembly)
  ↓ extractTextFromMessage() + extractContentBlocks()
  ↓ isSentinelOutput() filter
  ↓ setMessages() state update
MessageContent.tsx (rendering)
  ↓ BlockRenderer or MarkdownRenderer
User sees the message
```

### Stage-by-Stage Detail

| # | Stage | File | Function | What Happens | Content Filtered? |
|---|-------|------|----------|--------------|-------------------|
| 1 | WS transport | `useWebSocket.ts` | `ws.onmessage` | Raw WS frame → JSON.parse → calls `onMessage(message)` | None |
| 2 | Message routing | `ClawdChatInterface.tsx` L335-715 | `onMessage` callback | Routes by `message.type` + `message.event`: `res` (handshake/RPCs), `event/chat` (streaming), `event/agent`, `event/exec.approval.*`, `event/health`/`event/tick` (ignored) | None |
| 3a | Chat delta | `ClawdChatInterface.tsx` L434-466 | `state === 'delta'` | `extractTextFromMessage()` → sentinel check → assign `streamingMessageIdRef` outside updater → `setMessages()` create-or-replace | `isSentinelOutput()` only |
| 3b | Chat final | `ClawdChatInterface.tsx` L467-541 | `state === 'final'` | `extractTextFromMessage()` + `extractContentBlocks()` → sentinel check → update existing or append new | `isSentinelOutput()` only |
| 3c | Agent stream | `ClawdChatInterface.tsx` L547-579 | `event === 'agent'` | `extractTextFromMessage()` → sentinel check → shares `streamingMessageIdRef` with chat handler → create-or-replace | `isSentinelOutput()` only |
| 4 | Text extraction | `ClawdChatInterface.tsx` L82-119 | `extractTextFromMessage()` | Handles 4 shapes: bare string, `content: string`, `content: [{type:"text", text}]`, `data.text`. Joins multi-block with `\n` | None — raw passthrough |
| 5 | Block extraction | `ClawdChatInterface.tsx` L126-181 | `extractContentBlocks()` | Parses `content[]` into `ContentBlock[]`: text, toolCall, toolResult. Returns undefined if no structured blocks | None |
| 6 | Message render | `MessageContent.tsx` L150-167 | `MessageContent` | Priority: blocks → `BlockRenderer`, user text → `<span>`, assistant text → `MarkdownRenderer` (react-markdown + remarkGfm + Prism) | None |
| 7 | Block render | `MessageContent.tsx` L107-141 | `BlockRenderer` | Dispatches: text → `MarkdownRenderer`, toolCall → `ToolCallBlock`, toolResult → `ToolResultBlock` | None |
| 8 | Tool call UI | `ToolCallBlock.tsx` | `ToolCallBlock` | Renders tool name + collapsible JSON args | N/A |
| 9 | Tool result UI | `ToolResultBlock.tsx` | `ToolResultBlock` | Renders tool name + result text (collapses >5 lines) | N/A |
| 10 | Approval card | `ToolApprovalCard.tsx` | `ToolApprovalCard` | Inline card: pending → resolving/approved/denied/expired. Allow Once / Allow Always / Deny. 120s countdown. 15s safety-net timer (v1.0.11). | N/A |

### Sentinel Filter

`isSentinelOutput()` checks for exact matches: `NO`, `NO_REPLY`, `HEARTBEAT_OK`, and `HEARTBEAT_OK.*` prefix. This is the only content filter in the entire pipeline. It exists to suppress OpenClaw's memory flush housekeeping output (the ~2 min delay bug from Session 13).

### Key Refs

| Ref | Purpose | Set By | Cleared By |
|-----|---------|--------|-----------|
| `streamingMessageIdRef` | Tracks which message is currently being streamed (chat + agent) | First delta chunk | New user message (L1085), new conversation (L237) |
| `agentStreamingMessageIdRef` | Separate tracking for agent events (v1.0.12 fix) | First agent chunk | Same as above |
| `pendingQueueRef` | WS message queue for when socket isn't OPEN (v1.0.11 fix) | `send()` when readyState !== OPEN | Flushed on `onopen` |

### Existing Collapsible Patterns

`ToolCallBlock` and `ToolResultBlock` already implement collapsible rendering. ToolResult collapses content >5 lines. These provide a proven UI pattern that can be extended for reasoning blocks if needed.

---

## 3. Harmony Token Survival Analysis

### The Question

Do Harmony channel tokens (`<|channel|>analysis`, `<|channel|>final`, etc.) survive from Ollama through OpenClaw to ZuberiChat's WebSocket stream?

### The Answer

**No.** The tokens are special vocabulary items that Ollama's tokenizer decodes as empty strings. They vanish. But the **text content from all channels is concatenated** into a single undifferentiated string. This is the root cause of P1 #1 (internal monologue leakage).

### Token Survival at Each Layer

| Layer | Component | Handles Harmony? | What Happens |
|-------|-----------|-----------------|--------------|
| Ollama | Model generation | Yes | Model outputs to analysis, commentary, and final channels using special tokens |
| Ollama | Tokenizer decode | Strips tokens | Special tokens decoded as empty strings. Text from all channels concatenated. |
| Ollama | API layer | Depends on config | With `reasoning: false`: no `.thinking`/`.content` split. Everything in `.content`. With `reasoning: true`: Ollama separates `.thinking` (analysis) from `.content` (final). |
| OpenClaw | Config | `reasoning: false`, `thinkingDefault: off` | Tells Ollama not to split. Full concatenated text passes through as single stream. |
| OpenClaw | Gateway | No parsing | Forwards Ollama's content verbatim in `chat` event `payload.message` |
| ZuberiChat | `extractTextFromMessage()` | No filtering | Passes raw text to React state |
| ZuberiChat | `isSentinelOutput()` | No awareness | Only checks for `NO`, `NO_REPLY`, `HEARTBEAT_OK` |
| ZuberiChat | `MessageContent` → ReactMarkdown | No filtering | Renders whatever text is in `message.content` |

### The Template Logic Gap

The gpt-oss:20b Ollama template contains this unconditional instruction:

```
# Valid channels: analysis, commentary, final. Channel must be included for every message.
```

This is present **regardless of the reasoning flag**. When `reasoning: false`:
- The `Reasoning: medium/high/low` header is correctly omitted from the system prompt
- But the channel instruction remains — the model is still told to use all three channels
- The model generates analysis content, then final content
- Ollama decodes the channel tokens to nothing and concatenates everything
- Result: monologue + answer as a single undifferentiated string

### Fix Options (Ranked by Feasibility)

**Option 1 — Enable `reasoning: true` for gpt-oss:20b**

Ollama would then parse `<|channel|>analysis` into `.thinking` and `<|channel|>final` into `.content`, delivering them as separate fields. OpenClaw's thinking-enabled mode would separate them in WS events. ZuberiChat would render `.content` normally and `.thinking` as a collapsible block.

**Caveat:** Lesson #33 states that `reasoning: true` causes OpenClaw to send the system prompt as `developer` role, which Ollama silently drops. If this bug persists in v2026.3.8, Zuberi loses her entire system prompt. **Must test before implementing.** A 5-minute test: flip `reasoning: true` on gpt-oss:20b, restart gateway, ask Zuberi to recite something from SOUL.md. If she can, the bug is fixed. If she can't, this option is blocked.

**Option 2 — Custom Modelfile with `Reasoning: low`**

Create a custom Modelfile that injects `Reasoning: low` into the system block while keeping the default Harmony template intact. Reduces analysis trace to ~20 tokens. Does not eliminate monologue but makes it short enough to be unobtrusive. No risk to tool calls. Can be combined with Option 1 or 3.

**Option 3 — Frontend Harmony regex**

If tokens somehow leak as raw text (edge cases), add regex in `extractTextFromMessage()` to strip text between analysis channel markers. Fragile — depends on exact output format. Last resort.

**Option 4 — Custom Modelfile template modification**

Make the channel instruction conditional on reasoning mode, or remove it entirely when reasoning is disabled. Prevents the model from outputting to the analysis channel at all. Risk: may degrade tool call quality since the commentary channel shares the same instruction block.

### What Was Not Done

The monologue fix was investigated but **deferred** — James observed the leakage diminishing through natural use. The audit and analysis are preserved here for any future architect who revisits the problem. No code changes were made to ZuberiChat's streaming pipeline.

---

## Source Documents

| Document | Origin | Content |
|----------|--------|---------|
| Suppressing LLM Internal Monologue Leakage (deep research) | James's researcher | Harmony format internals, Ollama/OpenClaw failure modes, frontend filtering patterns, recommended architecture |
| ccode streaming pipeline audit (Session 19) | ccode on KILO | File-by-file pipeline map, Harmony token survival test, gateway log analysis, template dump |

---

*This document is a technical reference. It does not replace the handoff or project reference. Future architects: if you're working on monologue suppression or the approval system, start here.*
