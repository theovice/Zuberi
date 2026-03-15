# Giving your OpenClaw agent real-time context awareness

**Your OpenClaw agent can already see partial token data through the built-in `session_status` tool and `/status` command, but there's a critical problem: OpenClaw routes Ollama traffic through the OpenAI-compatible `/v1/chat/completions` endpoint, which silently caps context at 4,096 tokens by default and returns inaccurate counts.** This means the "2.7k/205k (1%)" context display is likely wrong for your Ollama-backed setup. The good news is that a layered approach — combining OpenClaw's existing hooks, Ollama's native API metadata, a community compaction plugin, and a lightweight MCP tool — can give your agent reliable context awareness without cloud dependencies or major infrastructure changes.

OpenClaw (the MIT-licensed agent gateway formerly known as Clawdbot and Moltbot, with 150K+ GitHub stars) exposes real token data in multiple places: session state, slash commands, compaction lifecycle hooks, and a plugin extensibility model. Ollama's native `/api/chat` endpoint returns precise `prompt_eval_count` and `eval_count` fields on every response. The gap is that these two systems don't properly bridge — and closing that gap is the core engineering challenge.

---

## OpenClaw already exposes token data, but Ollama counts are broken

OpenClaw provides several surfaces for token visibility. The **`/status` command** returns an emoji-rich status card showing context usage (e.g., "42.1k/200k (21%)"), last response input/output tokens, compaction count, and estimated cost. The **`/usage tokens`** command appends per-response token footers. The **`/context list`** and **`/context detail`** commands show a per-component breakdown of system prompt, workspace files, skill metadata, and tool schemas. And the agent itself can call the **`session_status` tool** mid-conversation to check context pressure.

Internally, session state (`sessions.json`) stores `inputTokens`, `outputTokens`, `totalTokens`, and `contextTokens`. Session transcripts in JSONL format record per-turn `.message.usage` with `input` and `output` fields.

**Here's the problem.** OpenClaw connects to Ollama through the OpenAI-compatible `/v1/chat/completions` layer, not the native `/api/chat` endpoint you'd expect. The `pi-ai` package's `openai-completions.js` module handles this routing. Ollama's OpenAI-compatible endpoint does not respect `OLLAMA_NUM_CTX` or the model's configured context window — it defaults to **4,096 tokens** when `num_ctx` isn't explicitly passed. Multiple GitHub issues confirm the damage: Issue #27278 shows every session message recording exactly `"input": 4096` regardless of actual conversation length. Issue #24068 reports context detected as 4,096 instead of 32,768. Issue #17799 documents severe undercounting across all Ollama-served models. The result is that your `/status` display, `session_status` tool, and compaction thresholds are all operating on fiction.

Your agent thinks it's at 1% context when it might be at 60%. Compaction fires reactively on API overflow errors rather than proactively at your configured threshold — the "bad path" where no `memoryFlush` runs and maximum context is lost.

## Ollama's native API returns precise token counts every turn

Ollama's native endpoints (`/api/chat` and `/api/generate`) return rich token metadata on every response. The key fields are **`prompt_eval_count`** (input tokens processed) and **`eval_count`** (output tokens generated), along with nanosecond-precision timing for `prompt_eval_duration`, `eval_duration`, `total_duration`, and `load_duration`. In streaming mode, these fields appear only in the final chunk where `done: true`. In non-streaming mode, they're in the single response object.

A typical `/api/chat` final response looks like:

```json
{
  "model": "gpt-oss:20b",
  "done": true,
  "prompt_eval_count": 8742,
  "eval_count": 312,
  "prompt_eval_duration": 342546000,
  "eval_duration": 4535599000,
  "total_duration": 4883583458
}
```

The `prompt_eval_count` here — **8,742** — represents the total context size sent to the model, not just the new user message. This is exactly the number you need for context awareness. Adding `eval_count` gives you the total tokens consumed after the turn: `8742 + 312 = 9,054`. Compare that against your 131,072 context window and you have real utilization.

Three important caveats apply. First, **`prompt_eval_count` disappears from responses when the KV cache hits** — if you send the same prompt twice while the model is loaded, the second response omits the field entirely (GitHub Issue #2068). You can detect cache hits by checking `prompt_eval_duration`, which drops dramatically (e.g., 962ms cold → 54ms warm). Second, **when the prompt exceeds `num_ctx`, Ollama silently truncates from the beginning** and `prompt_eval_count` returns the capped value. Third, **there is no standalone token counting endpoint** — you cannot pre-count tokens without sending them for inference (GitHub Issues #9229 and #3582 request this but remain unimplemented).

The `/api/ps` endpoint provides complementary data: it returns `context_length` for each loaded model, showing the currently allocated context window size. For your `gpt-oss:20b` with 131K context, this should return `131072` and serves as the denominator for utilization calculations.

## OpenClaw's extensibility model offers three paths to context awareness

OpenClaw has a three-layer extensibility architecture — Skills, Plugins, and MCP servers — each offering different levels of access to context metadata.

**Skills** (SKILL.md files) are prompt-based and cannot directly access session metadata programmatically. However, they can instruct the agent to call `session_status` and reason about the result. The official **`context-management` skill** does exactly this: it monitors `session_status` after tool-heavy operations (more than 5 tool calls), applies threshold rules at 50%, 70%, and 85% context usage, and writes a `.context-checkpoint.md` file before compaction with active task state, key decisions, files changed, and next steps. Install it with `/skill install openclaw/skills --skill context-management`.

**Plugins** (`openclaw.plugin.json`) have deeper access through the hook system. They can register for lifecycle events including `before_compaction`, `after_compaction`, `before_agent_start`, `session:start`, `session:end`, and `tool_result_persist`. Hooks receive a `HookContext` with session metadata including `sessionKey`, `agentId`, and `workspaceDir`. The community **`context-compactor` plugin** (by E-x-O-Entertainment-Studios-Inc) was built specifically for local models that don't report accurate token counts. It performs **client-side token estimation** using a configurable characters-per-token heuristic (default: 4 chars/token) in the `before_agent_start` hook, estimating context size before each turn.

**MCP servers** can expose arbitrary tools to the agent. Since OpenClaw supports 3,200+ MCP-based skills on ClawHub and every skill is technically an MCP server, you can build a custom MCP tool that queries Ollama's native `/api/ps` endpoint, parses the `context_length`, and combines it with whatever token tracking data you accumulate. The agent could call this tool like any other — `check_context_usage` — and receive a structured response with current utilization, remaining capacity, and proximity to compaction.

## Compaction hooks exist but have sharp edges

OpenClaw fires `before_compaction` and `after_compaction` hooks in the compaction lifecycle. These were originally defined but never called (Issue #4967); they were eventually shipped in PR #16788. The `after_compaction` hook receives `tokenCount` (the post-compaction context size) and `compactedCount` (number of messages removed). **The `before_compaction` hook passes `tokenCount` as `undefined`** — a significant limitation that means you cannot reliably know the pre-compaction token count from within the hook itself.

The **`memoryFlush` system** is OpenClaw's built-in pre-compaction safety net. When enabled, it triggers a silent agent turn before compaction that writes durable memories to disk. The trigger formula is `contextWindow - reserveTokensFloor - softThresholdTokens`. For your stack: `131,072 - 4,000 - 2,000 = 125,072 tokens`. Configuration in `openclaw.json`:

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "reserveTokensFloor": 4000,
        "memoryFlush": {
          "enabled": true,
          "softThresholdTokens": 2000,
          "prompt": "Write everything important from this session to memory/YYYY-MM-DD.md immediately."
        }
      }
    }
  }
}
```

The agent responds with `NO_REPLY` to suppress user-visible output. But because your Ollama token counts are unreliable, the flush may never trigger on the "good path." The compaction watchdog thinks you're at 1% when you're actually near overflow. When the Ollama API finally rejects the prompt with a 400 error, OpenClaw falls back to emergency compaction — no memory flush, maximum context loss. Issue #5429 documents a user losing approximately **45 hours of agent context** to this exact failure mode.

Two compaction trigger paths exist: **threshold maintenance** (the "good path," where `contextTokens > contextWindow - reserveTokens` after a successful turn) and **overflow recovery** (the "bad path," where the model returns a context overflow error and OpenClaw emergency-compacts then retries). With inaccurate Ollama token reporting, you're almost always on the bad path.

## Community patterns show a maturing ecosystem of context-aware agents

The broader agent ecosystem has converged on a common pattern: **display context usage prominently, auto-compact at a configurable threshold, and persist critical state before compaction.** Claude Code leads with a real-time status line showing token usage percentage, auto-compaction at ~95% usage, and a detailed `/context` command breaking down system prompt, tools, MCP servers, memory files, messages, and reserved space. Cline provides a visual progress bar in VS Code using token counts from API responses, with a `maxAllowedSize = Math.max(contextWindow - 40_000, contextWindow * 0.8)` formula. Goose auto-compacts at 80% (configurable via `GOOSE_AUTO_COMPACT_THRESHOLD`). ForgeCode offers the most granular configuration with separate token, message, and turn thresholds.

For token counting without a provider API, the community has established clear accuracy benchmarks:

- **tiktoken** (cl100k_base): 100% accuracy for OpenAI models, fast Rust core — but wrong tokenizer for your local 20B model
- **SentencePiece** (used by Llama, Mistral, and derivatives): 100% accuracy for those model families, runs locally
- **Characters ÷ 4 heuristic**: **75–85% accuracy**, fails badly on code, emoji, and non-English text (e.g., "Server-side streaming 🚀" estimates 8 tokens vs. 11 actual — a 37% miss)
- **Character-group weighted approach** (varying weights by character class): **90–95% accuracy** with tuning, still runs in microseconds
- **Words × 1.33**: ~80–85% accuracy, simplest implementation

The most relevant community project for your stack is the **`context-compactor` plugin**, which bypasses Ollama's broken reporting entirely by estimating token counts client-side using character counting. The **ClaudeFa.st context recovery hook** demonstrates a dual-trigger system (absolute token threshold plus percentage thresholds at 30%/15%/5% remaining) that you could adapt. And the **MCP Token Monitor server** (kpoziomek) provides a reusable pattern for exposing token metrics as MCP tools — though it targets the Anthropic API, the architecture is directly portable.

## The recommended architecture combines four layers

Given the Ollama token-reporting gap, no single mechanism provides reliable context awareness. The most practical approach layers four complementary strategies, ranked by implementation effort:

**Layer 1 — Immediate, zero code changes.** Enable `memoryFlush` in `openclaw.json` (shown above). Install the `context-management` skill from ClawHub. Add a workspace SKILL.md that instructs your agent to call `session_status` every 5–10 turns and reason about the result. Even with inaccurate Ollama counts, this establishes the behavioral pattern and works correctly if the underlying numbers are ever fixed. Configure `/usage tokens` to see per-turn reporting.

**Layer 2 — Install the `context-compactor` plugin.** This community plugin performs client-side token estimation in `before_agent_start`, sidestepping Ollama's broken reporting entirely. Configure `charsPerToken: 3.5` (slightly conservative for a 20B model's tokenizer, which likely uses SentencePiece) and `maxTokens: 125000` to match your compaction threshold. This gives you ~85–90% accuracy with zero model inference overhead.

**Layer 3 — Build a lightweight MCP tool.** Create an MCP server (TypeScript or Python) that:
1. Queries `GET http://localhost:11434/api/ps` to get the actual `context_length` (your 131,072 denominator)
2. Maintains a running sum of `prompt_eval_count` and `eval_count` from Ollama's native API responses (by making a direct `/api/chat` call with `stream: false` for a trivial prompt to verify the model's context state)
3. Reads the session JSONL transcript from `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl` and sums per-turn `.message.usage.input` values
4. Returns a structured object: `{ contextWindow: 131072, estimatedUsed: 87340, percentUsed: 66.6, turnsUntilCompaction: ~12, compactionThreshold: 125072 }`

Register this as `context_awareness` in your `openclaw.json` MCP server config. The agent can call it any time. This is the **highest-accuracy local solution** because it combines Ollama ground truth with session history analysis.

**Layer 4 — Add a ZuberiChat context gauge.** In your Tauri app's TypeScript layer, intercept WebSocket messages between ZuberiChat and the OpenClaw gateway. Maintain a running character count of all messages (system prompt + user + assistant), divide by 3.5, and display a progress bar in the UI. This gives the *human* real-time visibility even when the agent lacks it. The Rust backend can parse Ollama response JSON (if you proxy or mirror native API calls) for precise counts. Cline's progress bar implementation is a good reference — it tracks `api_req_started` messages and updates as responses stream.

**Layer 5 — Fix the root cause (higher effort, highest payoff).** The fundamental problem is that OpenClaw's `pi-ai` package sends requests through Ollama's `/v1/chat/completions` endpoint without passing `num_ctx`. If you modify (or fork) the Ollama provider in OpenClaw to either (a) pass `options: { num_ctx: 131072 }` in every request to the OpenAI-compatible endpoint, or (b) switch to using Ollama's native `/api/chat` endpoint directly, all of OpenClaw's built-in token tracking — `/status`, `session_status`, compaction thresholds, `memoryFlush` — starts working correctly. This is a targeted change to one file (`openai-completions.js` in the `pi-ai` package). Check GitHub Issues #4028, #24068, and #27278 for community patches and discussion. If a fix has landed in v2026.3.1, verify by checking `/status` after a multi-turn conversation — if it still shows 4096 input on every turn, the bug persists.

## Conclusion

The most important finding is that **your stack has a known, documented bug** where OpenClaw records truncated token counts from Ollama's compatibility layer, making all built-in context awareness features unreliable. This isn't a missing feature — it's a broken bridge between two systems that each independently have the data you need.

Your fastest path to real context awareness is a three-step plan: install the `context-compactor` plugin for client-side estimation today (Layer 2), build the MCP tool for ground-truth verification this week (Layer 3), and submit or apply a patch to OpenClaw's Ollama provider to pass `num_ctx` correctly (Layer 5). Once the root cause is fixed, Layers 1's built-in features (`memoryFlush`, `session_status`, compaction thresholds) become fully functional and the estimation layers become redundant validation rather than primary signals.

The agent's proactive decision-making then follows naturally: call `session_status` or `context_awareness` every few turns, write checkpoint files at 70% utilization, begin deferring non-essential skill loads at 80%, trigger explicit `/compact` at 90%, and trust `memoryFlush` as the final safety net at 95%. Your ~5,900 tokens per turn of root files means roughly **21 turns of headroom** between 70% and your compaction threshold — enough for the agent to wrap up its current task and persist state gracefully.