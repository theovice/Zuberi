# **Orchestrating Local LLMs: Advanced Strategies for Suppressing Chain-of-Thought Leakage in GPT-OSS Architectures**

The deployment of advanced, reasoning-capable large language models (LLMs) within localized environments introduces complex orchestration paradigms, particularly concerning the strict isolation of a model's internal cognitive processes from user-facing interfaces. In bespoke application stacks utilizing Ollama as the primary inference engine, OpenClaw as the autonomous agentic framework, and a custom Tauri-based application (such as the ZuberiChat environment) as the frontend, the deployment of models like gpt-oss:20b frequently results in persistent chain-of-thought (CoT) leakage. This systemic issue manifests as the model's internal monologue—such as file evaluation sequences, self-correcting logic, and tool-planning steps—bleeding directly into the final conversational interface without any structural separation from the intended response.

Resolving this architectural friction requires an exhaustive understanding of the underlying model architecture, the specific tokenization protocols it natively employs, the middleware parsing logic of the orchestrating framework, and the client-side rendering heuristics. The following comprehensive analysis deconstructs the intrinsic behavior of gpt-oss:20b, evaluates the efficacy and failure modes of suppression mechanisms across the Ollama and OpenClaw layers, analyzes comparative frontend paradigms, and outlines a definitive, lightweight architectural strategy to eliminate reasoning leakage while preserving the high-fidelity agentic capabilities of the localized assistant.

## **The Cognitive Architecture of gpt-oss:20b**

To effectively suppress the internal monologue of gpt-oss:20b, it is critical to understand that the model represents a fundamental departure from traditional autoregressive text generation. Released under the Apache 2.0 license, gpt-oss:20b utilizes a Transformer-based architecture enhanced by a Mixture-of-Experts (MoE) design.1 While it possesses 21 billion total parameters, it activates only approximately 3.6 billion parameters during inference.1 Furthermore, the model is post-trained utilizing MXFP4 quantization, allowing it to operate efficiently within 16GB of unified memory.2 However, its cognitive architecture is structurally dependent on explicit, multi-step reasoning.

## **The OpenAI Harmony Response Format**

The root cause of reasoning leakage in gpt-oss:20b deployments is its strict, reinforcement-learned adherence to the OpenAI "Harmony" response format. Unlike models such as DeepSeek-R1 or newer iterations of Qwen, which typically wrap their internal monologues in easily identifiable \<think\>...\</think\> XML tags, gpt-oss:20b was heavily post-trained to emit a structured, multi-channel token protocol. This protocol routes different types of cognitive and operational output to highly specific virtual "channels".3

The Harmony format utilizes specialized control tokens to delineate the boundaries, roles, and intent of every generated block of text. The model is mathematically conditioned to assume that a downstream parser will intercept these specific tokens and route the subsequent text accordingly.3

| Special Token | Token ID | Purpose within the Harmony Protocol |
| :---- | :---- | :---- |
| \`\< | start | \>\` |
| \`\< | end | \>\` |
| \`\< | channel | \>\` |
| \`\< | message | \>\` |
| \`\< | constrain | \>\` |
| \`\< | return | \>\` |

Within the Harmony architectural paradigm, gpt-oss:20b is mandated to generate text across three primary operational channels:

1. **The Analysis Channel:** This serves as the model's internal cognitive workspace. It is used exclusively for chain-of-thought reasoning, goal decomposition, and evaluating the necessity of tool execution.3 Crucially, this channel is explicitly not intended for end-user visibility. Output within the analysis channel frequently bypasses standard conversational safety guardrails and contains raw, unfiltered cognitive processing.3  
2. **The Commentary Channel:** This channel is utilized as an intermediate layer for formatting function calls and establishing tool execution preambles.3 When the model decides to invoke an OpenClaw skill, the JSON payload is constructed here.  
3. **The Final Channel:** This is the only channel formally intended for user consumption. Messages tagged with the final channel represent the curated, synthesized, and safety-aligned answer to the user's prompt.3

When gpt-oss:20b is queried in a local environment, its raw, unparsed output stream inherently mimics the following structure: \<|channel|\>analysis\<|message|\>The user is asking to read a file. I need to verify the path. The path provided seems incomplete... I will execute a search first.\<|end|\>\<|start|\>assistant\<|channel|\>commentary to=functions.read\_file \<|constrain|\>json\<|message|\>{"path": "/home/user/config.json"}\<|call|\>\<|start|\>assistant\<|channel|\>final\<|message|\>I am checking the configuration file for you now..4

If the orchestrating middleware (OpenClaw) or the inference engine (Ollama) fails to properly parse the string and strip the tokens preceding the final channel, the entire raw string, complete with the analysis monologue and commentary logic, is transmitted directly to the chat frontend.

## **Intrinsic Narration Behavior and Reinforcement Learning**

A critical deduction regarding gpt-oss:20b is that it is specifically and aggressively trained to narrate its reasoning process. It does not possess a native "thinking mode" that can simply be toggled on or off like a binary switch.9 The narration is fundamentally baked into its response style as a core mechanism for improving accuracy on complex tasks, reducing hallucinatory outputs, and preparing multi-step tool calls.11

The model underwent extensive post-training using reinforcement learning (RL) techniques specifically designed to reward detailed chain-of-thought processing before final answer generation.13 Consequently, the model views the generation of tokens within the \<|channel|\>analysis block not as an optional feature, but as a mandatory prerequisite for fulfilling complex user requests. Security evaluations and red-teaming exercises conducted on gpt-oss:20b have identified phenomena such as "reasoning procedure mirages" and "reasoning blackholes," which demonstrate that the model's output quality and safety alignment are deeply tethered to the integrity of its analysis channel.15 Artificially suppressing this channel via aggressive system prompting or truncation often results in severe behavioral degradation, drastically increased refusal rates, or the model becoming permanently trapped in repetitive logic loops.15

## **Comparative Analysis of Reasoning Models**

When evaluating localized agentic orchestration, the behavior of gpt-oss:20b must be contextualized against other contemporary models. The Harmony format makes gpt-oss:20b uniquely difficult to manage in custom frontends that expect standardized, single-stream conversational outputs.

| Model Family | Core Architecture | CoT Implementation | Orchestration Compatibility | Leakage Suppression Method |
| :---- | :---- | :---- | :---- | :---- |
| **gpt-oss:20b** | MoE (21B / 3.6B active) | Structural (Harmony Channels) | High friction. Requires complex multi-channel parser. | Structural regex matching of channel tokens. |
| **Qwen 3 (32B)** | Dense | Tag-based (\<think\>...\</think\>) | Moderate friction. Tends to overthink and output massive trace lengths. | Direct tag stripping or API-level boolean toggles. |
| **Llama 3.3 (70B)** | Dense | Implicit (No forced CoT) | Low friction for text, moderate friction for complex tools. | N/A (No structural internal monologue). |
| **Mistral (Nemo)** | Dense | Implicit (No forced CoT) | Low friction. Standard instruction-response behavior. | N/A (No structural internal monologue). |

Models such as Qwen 3 and DeepSeek-R1 utilize an XML-style \<think\> block.10 This approach is vastly easier to handle in client-side applications, as standard markdown parsers and basic regular expressions can effortlessly detect the opening and closing brackets, wrapping the content in collapsible HTML \<details\> elements.19 Furthermore, frameworks like Ollama have built native API support to simply strip these tags before returning the payload if requested.10

Conversely, dense models like Llama 3.3 and Mistral do not employ a multi-channel reasoning format by default.20 They generate code and text directly without a mandatory, structured internal monologue. While this results in significantly faster time-to-first-token (TTFT) metrics for simple tasks, these models frequently struggle with the complex, multi-step tool orchestration required by frameworks like OpenClaw without heavy few-shot prompting.20 The gpt-oss:20b model bridges this gap by enforcing reasoning, but pays the penalty of architectural complexity via the Harmony format.

## **Ollama-Level Suppression Mechanisms**

Ollama serves as the foundational inference engine in the Zuberi stack. Managing reasoning leakage must logically begin at this layer. However, severe limitations in Ollama's current handling of the OpenAI Harmony format complicate straightforward solutions.

## **The Failure of the think Parameter**

Recent updates to the Ollama architecture introduced native capabilities to manage thinking models, exposing a think field in its API payload and a corresponding \--think command-line flag. For models adhering to standard XML-based reasoning (like Qwen or DeepSeek), passing "think": false or utilizing the /set nothink command during an interactive session successfully suppresses the output of the reasoning trace at the server level.10

However, for gpt-oss:20b, this specific mechanism is entirely ineffective. The model's architecture does not natively support a binary "not thinking" state.9 When \--think=false is passed to the Ollama CLI, or think: false is transmitted via the API by a client like OpenClaw, gpt-oss:20b simply ignores the parameter and continues to generate its analysis trace.9

Ollama's internal translation logic expects gpt-oss models to receive a specific reasoning effort parameter defined strictly as "low", "medium", or "high".10 Passing boolean values (true/false) results in a parsing mismatch where the parameter is discarded. Consequently, the model falls back to its default configuration—a "medium" reasoning effort—allowing the internal monologue to persist unabated.10

## **Modelfile Template Modifications**

The most direct and powerful method of influencing gpt-oss:20b at the Ollama execution layer is through the customization of its Modelfile. The Modelfile defines the TEMPLATE, SYSTEM prompts, and operational parameters injected before the model weights are instantiated into VRAM.23

The default TEMPLATE for gpt-oss:20b provided in the Ollama registry is exceptionally complex.24 It embeds extensive dynamic logic written in Go template syntax to handle the Harmony format transitions, inject built-in tool schemas (such as native browser navigation and Python sandbox execution), and establish valid channel parameters.24 To suppress the internal monologue, specific modifications to this template architecture are required.

**1\. Injecting Reasoning Effort Limitations:** By creating a custom Modelfile for the Zuberi assistant, the reasoning effort can be hardcoded to its absolute lowest threshold. While this does not completely eliminate the analysis channel, it drastically truncates the internal monologue—often reducing it to a single sentence or fewer than 30 tokens.13 This minimizes the physical volume of leaked text and reduces the computational latency.

Dockerfile

FROM gpt-oss:20b  
SYSTEM """You are Zuberi, a highly efficient local assistant.   
Knowledge cutoff: 2024-06  
Reasoning: low

\# Valid channels: analysis, commentary, final. Channel must be included for every message.  
"""

It is vital to note that attempts to utilize commands such as Reasoning: none or Reasoning: off inside the system template are largely counterproductive. The base model does not recognize "none" as a valid Harmony state. When confronted with this invalid parameter, it will typically treat it as an error and silently default to "medium" effort, completely negating the suppression attempt.25

**2\. Forcing Channel Outputs via Template Coercion:**

A significantly more aggressive Ollama-level suppression technique involves manipulating the TEMPLATE directive to "pre-fill" the assistant's response, effectively coercing the model to bypass the analysis channel and initiate text generation directly in the final channel. By appending the final channel markers to the absolute end of the user prompt sequence, the model interprets the operational context as if the analysis phase has already concluded.

This is achieved by embedding Harmony tokens directly into the template serialization format:

Go

TEMPLATE """{{ if.System }}\<|start|\>system\<|message|\>{{.System }}\<|end|\>{{ end }}{{ if.Prompt }}\<|start|\>user\<|message|\>{{.Prompt }}\<|end|\>{{ end }}\<|start|\>assistant\<|channel|\>final\<|message|\>"""

By terminating the sequence with \<|channel|\>final\<|message|\>, the model is forced into immediate user-facing output.4 While this mechanism is highly effective for standard conversational tasks, it comes with a severe structural penalty: it critically impairs the model's ability to utilize OpenClaw's autonomous tools. Tool calling within the Harmony format explicitly relies on the commentary and analysis channels to structure JSON execution payloads properly.3 Bypassing these channels blinds the model to its agentic capabilities, transforming a sophisticated agent into a basic chatbot.

## **OpenClaw-Level Mechanisms and Orchestration Dynamics**

OpenClaw operates as the complex orchestration layer, acting as the nervous system that connects the Tauri frontend to the Ollama inference engine. It manages persistent session states, dynamic tool execution (via the localized PI Agent), context compaction, and continuous system prompt construction.28 When a multi-channel model like gpt-oss:20b is routed through OpenClaw, several points of architectural friction arise that actively contribute to, rather than prevent, reasoning leakage.

## **Configuration Disconnects: reasoning: false and thinkingDefault**

In the standard deployment scenario, the configuration parameters dictate reasoning: false within the model provider object and thinkingDefault: "off" in the agent defaults. Theoretically, this dual-layered approach should instruct OpenClaw's internal processing pipeline to filter out any cognitive traces before the payload is dispatched to the client.30

However, deep telemetry and issue reports from the OpenClaw repository indicate persistent systemic bugs regarding how these specific flags are processed, particularly when interfacing with non-standard token protocols like Harmony:

1. **The API Wrapper Mismatch:** OpenClaw communicates with Ollama via the openai-completions API adapter. When thinkingDefault: "off" is set, OpenClaw's core logic attempts to omit the reasoning payload from its internal messaging arrays. However, because gpt-oss:20b generates its reasoning natively as part of the raw text string (using embedded Harmony tokens rather than segregating the text into standard JSON .reasoning fields expected by OpenAI's latest API specs), OpenClaw's standard heuristic filters fail to recognize the text as reasoning.31 The framework parses the \<|channel|\>analysis\<|message|\> output simply as standard assistant text and forwards it directly to the routing layer.33  
2. **Streaming Vulnerabilities and Delta Bypasses:** When streaming is enabled—a common requirement for responsive local UIs like ZuberiChat—text deltas are dispatched to the frontend in real-time over WebSockets. OpenClaw's internal deduplication and reasoning-stripping logic (such as the postProcessAssistantMessage function) frequently only executes *after* the complete message block has been fully assembled in memory. Consequently, the streaming chunks containing the internal monologue bypass the post-processing filter entirely and render instantaneously on the client interface.33  
3. **State Management Deletion Bugs:** Documented architectural issues (e.g., OpenClaw Bugs \#24411 and \#40736) reveal that even when /reasoning off or thinkingDefault: "off" is explicitly declared, specific channel extensions fail to respect the setting, delivering the internal chain-of-thought unconditionally.34 In specific minor versions of the framework, toggling reasoning to "off" simply deletes the field entirely in the active session entry. This deletion causes the framework to fall back to the connected model's default behavior. For gpt-oss:20b, the default behavior is continuous, mandatory reasoning.34

## **The Impact of Workspace System Prompt Injection**

A defining characteristic of OpenClaw is its reliance on dynamic, highly aggressive system prompt assembly. It does not inject instructions passively; it continuously aggregates and updates the context window using AGENTS.md, SOUL.md, HEARTBEAT.md, and locally available skill manifests based on the real-time workspace environment.29 The core prompt generation is governed by the system-prompt.ts file, which injects dense, strict directives regarding tool schemas, safety guardrails, and message routing.36

The continuous injection of this heavy, complex context paradoxically exacerbates reasoning leakage with gpt-oss:20b. The model's reinforcement learning dictates that highly complex instructions—such as those generated by OpenClaw's rigid tool schemas and workspace rules—require deep, meticulous analysis before execution is attempted. When the context window fills with OpenClaw's environmental variables and skill definitions, the model automatically increases its reliance on the analysis channel to parse the requirements. This results in the generation of highly verbose internal monologues (e.g., *"The workspace rules dictate I must not invent commands. I need to verify the tool schema for reading files. Let's read the file... The path seems wrong according to AGENTS.md..."*) as it attempts to safely satisfy the injected system constraints.29

## **OpenClaw Middleware and Hook Interception**

To combat the inherent failure of standard configuration flags against the Harmony format, advanced integrators within the OpenClaw community rely on internal lifecycle hooks—specifically before\_prompt\_build and agent\_end—to engineer custom middleware filters.39

A highly effective, albeit complex, OpenClaw-level mechanism involves deploying a regex-based interceptor via a custom gateway plugin. By hooking into the message\_sending lifecycle event, the raw payload can be intercepted and sanitized before it is serialized and dispatched over the WebSocket to the Tauri frontend.38 This middleware inspects the raw text generated by the Ollama instance, identifies the Harmony channel tokens, and surgically extracts only the content residing within the final channel. While effective, this approach requires custom TypeScript plugin development, constant maintenance against OpenClaw version updates, and introduces slight processing latency to the streaming pipeline.

## **System Prompt Engineering and Semantic Constraints**

A common, intuitive approach to controlling aberrant model behavior is semantic instruction—engineering the system prompt to explicitly forbid specific outputs. In the context of gpt-oss:20b and the Harmony format, this approach is notoriously unreliable and often counterproductive.

## **The Failure of Negative Constraints**

Injecting explicit negative directives such as *"Do not narrate your reasoning process,"* *"Output only the final answer,"* or *"Never use the analysis channel"* into OpenClaw's SOUL.md or the Ollama Modelfile yields a phenomenally high failure rate.

The gpt-oss:20b model's foundational training makes it highly resistant to negative semantic constraints that directly contradict its cognitive architecture.42 Because the Harmony formatting is enforced at the deepest token-generation level via reinforcement learning, the model views the analysis channel as an absolute structural prerequisite for fulfilling user requests.44 When instructed by a user prompt not to use this channel, the model experiences an internal conflict—often referred to in security literature as "Schrodinger's compliance"—a paralyzed state where it becomes trapped between the system prompt's explicit command to skip reasoning and its baseline training which dictates it must analyze prior to answering.15

This architectural dissonance generally results in one of two failure modes:

1. **The Meta-Monologue:** The model utilizes the analysis channel anyway to internally debate whether it is allowed to use the analysis channel (e.g., *"The system instructions say I must not output reasoning. I must ensure I follow the rules and do not output reasoning. Therefore, I will now formulate my response without reasoning and output the final answer."*).46  
2. **Boundary Bleed:** Because it is artificially blocked from using its designated cognitive workspace by the prompt, the model leaks its reasoning directly into the final channel as standard conversational text, completely negating the purpose of the suppression attempt.38

## **The Illusion of Reasoning: none**

Various community discussions and unofficial documentations suggest injecting the exact phrase Reasoning: none into the system message as a bypass.47 However, empirical testing within the local LLM community definitively indicates that gpt-oss:20b does not natively recognize "none," "off," or "false" as valid internal architectural states. When presented with Reasoning: none, the model's parser frequently defaults back to a "medium" reasoning state, treating the invalid string as a hallucination and completely ignoring the suppression attempt.25

The only reliable semantic parameter is Reasoning: low. While this does not suppress the internal monologue entirely, it forcefully limits the cognitive trace to a brief, highly truncated string (usually under 20 tokens). This significantly reduces the visual footprint of the leakage and accelerates the time-to-first-token.25 However, relying solely on system prompt engineering is an insufficient standalone solution for a production-grade application and strictly requires a programmatic technical backstop.

## **Frontend and Client-Side Filtering Patterns**

Given the fragility of OpenClaw's internal filters when parsing non-standard API responses, combined with the proven unreliability of semantic system prompting against RLHF-trained models, the most robust and fault-tolerant mechanism for hiding internal monologues is client-side heuristic filtering. Other prominent, mature chat interfaces have developed specific architectural patterns to manage reasoning models that lack clean \<think\> tags.

## **Approaches in Alternative Chat Interfaces**

**Open WebUI:** Open WebUI handles gpt-oss reasoning through the implementation of highly customizable, regex-driven pipeline filters.7 Because Open WebUI natively expects the standard \<think\> structure introduced by DeepSeek, the raw Harmony tokens initially break the UI's parsing logic, causing analysis text to spill wildly into the chat window. To resolve this, Open WebUI allows administrators to define custom start and end strings in the model's advanced parameter settings, or via Python-based pipeline filters.7 By setting the start detection tag to \<|channel|\>analysis\<|message|\> and the end tag to \<|end|\> or \<|start|\>assistant\<|channel|\>final\<|message|\>, the Python backend successfully intercepts the cognitive trace, wraps it in a collapsible \<details\> HTML block, and hides it from the default view before it ever touches the DOM.19

**SillyTavern:** The SillyTavern platform relies heavily on its robust Regex Extension module to manage internal monologues and format deviations.49 Users deploy custom PCRE (Perl Compatible Regular Expressions) scripts that automatically scan incoming text streams. These scripts detect specific narrative patterns or Harmony tokens and seamlessly replace or delete them before the text is rendered in the chat log.51 This regex matching is processed locally in the browser's JavaScript engine, ensuring that the backend context (which the AI uses to maintain conversational continuity) remains completely intact, while the frontend display is aggressively sanitized.

## **Heuristics vs. Structural Tagging**

Client-side filtering fundamentally relies on two distinct methodologies:

1. **Heuristic Linguistic Patterns:** This methodology involves utilizing regex to search for linguistic patterns typical of internal monologues, such as sentences beginning with "Let's read the file," "I should check the guidelines," or "The user wants...".38 This approach is exceptionally error-prone. Distinguishing algorithmically between a model's genuine, helpful conversational response and its internal planning is semantically complex. This frequently results in false positives, where legitimate answers are accidentally hidden or deleted from the user's view.38  
2. **Structural Tagging (The Clean Approach):** This approach relies on capturing the exact, non-natural token strings injected by the model's underlying architecture. For gpt-oss:20b, this means explicitly targeting the Harmony control tokens.53 Because the model is heavily penalized during training for deviating from the rigid Harmony structure, these tokens represent a highly reliable, deterministic boundary. Regex parsers can lock onto these specific token sequences without risking the accidental deletion of natural, user-facing text.4

## **Recommended Architecture for the Zuberi Stack**

Addressing the chain-of-thought leakage within the specific Zuberi application stack (Ollama \+ OpenClaw \+ Custom Tauri Frontend) requires a synthesized, multi-layered approach.

Relying exclusively on OpenClaw's configuration flags (reasoning: false) is inadequate due to API translation failures and real-time streaming bypasses. Conversely, attempting to suppress reasoning purely via system prompts severely degrades gpt-oss:20b's ability to utilize OpenClaw's complex toolsets, rendering the agent largely useless for autonomous tasks.

The lightest-weight, most computationally reliable architecture preserves the model's innate capability to reason internally—ensuring high-fidelity tool execution and file manipulation—but aggressively and deterministically sanitizes the output string at the absolute network boundary, just before it renders in the user interface.

## **Layer 1: Modelfile Optimization (The Ollama Engine)**

First, the physical volume of the reasoning trace must be minimized to reduce payload size, network transit time, and processing latency, all without breaking the model's vital tool-calling capabilities. This is achieved by defining a custom Ollama Modelfile that enforces the lowest acceptable reasoning threshold.

1. Create a custom Modelfile for the Zuberi deployment.  
2. Maintain the default, complex TEMPLATE required for Harmony tool calling.24 Do not attempt to forcefully append the \<|channel|\>final token to the user prompt, as this will blind the model to OpenClaw's workspace constraints and prevent JSON schema generation.  
3. Inject the Reasoning: low parameter explicitly into the system prompt block.13

This foundational layer ensures the model still thinks—maintaining its reliability against OpenClaw's complex instructions—but restricts the rambling "Let's read the file" monologues to the absolute minimum required token count.

## **Layer 2: Deactivation of Fragile Framework Toggles (OpenClaw)**

Because OpenClaw's internal reasoning filters actively conflict with the structural realities of the Harmony format, it is strictly recommended to disable them. This prevents unexpected message truncation, state-deletion bugs, and the desynchronization of streaming chunks.

1. Remove thinkingDefault: "off" and reasoning: false from the openclaw.json configuration entirely.34  
2. Allow OpenClaw to process the Ollama payload natively as standard, continuous text. By treating the entire Harmony string (including the analysis, commentary, and final channels) as a single unified response, OpenClaw's internal deduplication systems remain stable, and streaming events pass cleanly to the WebSocket without being arbitrarily mangled by incompatible filters.33

## **Layer 3: Structural Regex Extraction (The Tauri Frontend)**

The definitive backstop must be implemented within the custom Tauri application (ZuberiChat). Since the Tauri framework utilizes a highly performant Rust backend and a web-based frontend (e.g., React, Vue, or vanilla TypeScript), the filtering logic can be executed efficiently in the Rust layer before the payload ever reaches the JavaScript DOM, ensuring zero UI flicker or rendering lag.

The objective is to scan the incoming WebSocket stream from OpenClaw, isolate the specific Harmony channel tokens, and extract exclusively the payload designated for the user.

**Implementation Logic via Regex:** When the frontend receives the raw message payload, it must pass the string through a regex parser designed to capture only the text sequentially following the final channel tag, terminating at the end of the message.53

A highly reliable PCRE regex pattern for final-channel extraction is:

(?\<=\<\\|channel\\|\>final\<\\|message\\|\>).\*?(?=\<\\|end\\|\>|\<\\|return\\|\>|$)

*Execution Flow in the Tauri Environment:*

1. **Streaming Parsing State Machine:** If the ZuberiChat application streams tokens in real-time, the Rust state manager must buffer incoming text chunks. UI rendering must remain suspended until the exact substring \<|channel|\>final\<|message|\> is detected within the buffer. Once this structural boundary is detected, the buffer is flushed, and all subsequent tokens are pushed immediately to the UI rendering state.10 All tokens preceding this marker—containing the low-effort reasoning and tool JSONs—are silently discarded from the user view.  
2. **Static Message Parsing:** If the application architecture awaits the full, completed message block from OpenClaw prior to rendering, the entire payload is simply passed through the regex extraction function. The function cleanly isolates the final conversational string, completely discarding the preceding analysis and commentary blocks, thereby ensuring the user is presented only with the flawlessly sanitized, final answer.53

By embracing this tripartite architecture—optimizing the inference prompt, removing fragile orchestration filters, and enforcing strict structural regex boundaries at the client level—developers can effectively harness the profound reasoning capabilities of gpt-oss:20b while maintaining a pristine, professional conversational interface.

#### **Works cited**

1. gpt-oss-20B (high) vs Llama 3.3 Instruct 70B: Model Comparison \- Artificial Analysis, accessed March 11, 2026, [https://artificialanalysis.ai/models/comparisons/gpt-oss-20b-vs-llama-3-3-instruct-70b](https://artificialanalysis.ai/models/comparisons/gpt-oss-20b-vs-llama-3-3-instruct-70b)  
2. openai/gpt-oss-20b \- Hugging Face, accessed March 11, 2026, [https://huggingface.co/openai/gpt-oss-20b](https://huggingface.co/openai/gpt-oss-20b)  
3. OpenAI Harmony Response Format, accessed March 11, 2026, [https://developers.openai.com/cookbook/articles/openai-harmony/](https://developers.openai.com/cookbook/articles/openai-harmony/)  
4. What is GPT OSS Harmony Response Format? | by Cobus Greyling \- Medium, accessed March 11, 2026, [https://cobusgreyling.medium.com/what-is-gpt-oss-harmony-response-format-a29f266d6672](https://cobusgreyling.medium.com/what-is-gpt-oss-harmony-response-format-a29f266d6672)  
5. Build a Weather Assistant with OpenAI GPT-OSS and Harmony SDK on Vast.ai, accessed March 11, 2026, [https://vast.ai/article/build-a-weather-assistant-with-openai-gpt-oss-and-harmony-sdk-on-vast-ai](https://vast.ai/article/build-a-weather-assistant-with-openai-gpt-oss-and-harmony-sdk-on-vast-ai)  
6. How to handle the raw chain of thought in gpt-oss \- OpenAI for developers, accessed March 11, 2026, [https://developers.openai.com/cookbook/articles/gpt-oss/handle-raw-cot/](https://developers.openai.com/cookbook/articles/gpt-oss/handle-raw-cot/)  
7. Hiding the thinking process from the response text : r/LocalLLaMA \- Reddit, accessed March 11, 2026, [https://www.reddit.com/r/LocalLLaMA/comments/1n6cx1u/hiding\_the\_thinking\_process\_from\_the\_response\_text/](https://www.reddit.com/r/LocalLLaMA/comments/1n6cx1u/hiding_the_thinking_process_from_the_response_text/)  
8. Unclear channel format · Issue \#56 · openai/harmony \- GitHub, accessed March 11, 2026, [https://github.com/openai/harmony/issues/56](https://github.com/openai/harmony/issues/56)  
9. set nothink or \--think=false Not working for gpt-oss:20b · Issue \#11751 \- GitHub, accessed March 11, 2026, [https://github.com/ollama/ollama/issues/11751](https://github.com/ollama/ollama/issues/11751)  
10. Thinking \- Ollama's documentation, accessed March 11, 2026, [https://docs.ollama.com/capabilities/thinking](https://docs.ollama.com/capabilities/thinking)  
11. GPT-OSS-120B & 20B: OpenAI's Powerful New Open-Source Models Explained \- Medium, accessed March 11, 2026, [https://medium.com/@tahirbalarabe2/gpt-oss-120b-20b-openais-powerful-new-open-source-models-explained-1f706123a30f](https://medium.com/@tahirbalarabe2/gpt-oss-120b-20b-openais-powerful-new-open-source-models-explained-1f706123a30f)  
12. OpenAI's Open-Weight Models: A Technical Deep Dive into the gpt-oss-120b and gpt-oss-20b Models \- Shubham, accessed March 11, 2026, [https://shubh7.medium.com/openais-open-weight-models-a-technical-deep-dive-into-the-gpt-oss-120b-and-gpt-oss-20b-models-0e831def0e2f](https://shubh7.medium.com/openais-open-weight-models-a-technical-deep-dive-into-the-gpt-oss-120b-and-gpt-oss-20b-models-0e831def0e2f)  
13. gpt-oss-120b & gpt-oss-20b Model Card \- OpenAI, accessed March 11, 2026, [https://cdn.openai.com/pdf/419b6906-9da6-406c-a19d-1bb078ac7637/oai\_gpt-oss\_model\_card.pdf](https://cdn.openai.com/pdf/419b6906-9da6-406c-a19d-1bb078ac7637/oai_gpt-oss_model_card.pdf)  
14. Introducing gpt-oss \- OpenAI, accessed March 11, 2026, [https://openai.com/index/introducing-gpt-oss/](https://openai.com/index/introducing-gpt-oss/)  
15. Quant Fever, Reasoning Blackholes, Schrodinger's Compliance, and More: Probing GPT‑OSS‑20B \- arXiv, accessed March 11, 2026, [https://arxiv.org/html/2509.23882v1](https://arxiv.org/html/2509.23882v1)  
16. Quant Fever, Reasoning Blackholes, Schrodinger's Compliance, and More: Probing GPT‑OSS‑20B \- arXiv.org, accessed March 11, 2026, [https://arxiv.org/html/2509.23882](https://arxiv.org/html/2509.23882)  
17. gpt-oss:20b generating lots of repeated chunks ( is worse when prompt contains typos ) · Issue \#12741 \- GitHub, accessed March 11, 2026, [https://github.com/ollama/ollama/issues/12741](https://github.com/ollama/ollama/issues/12741)  
18. Ollama Thinking Model: Unleashing AI's Chain-of-Thought with Modular Reasoning and MoE | by Aloy Banerjee | Medium, accessed March 11, 2026, [https://medium.com/@aloy.banerjee30/ollama-thinking-model-unleashing-ais-chain-of-thought-with-modular-reasoning-and-moe-cb9f32546815](https://medium.com/@aloy.banerjee30/ollama-thinking-model-unleashing-ais-chain-of-thought-with-modular-reasoning-and-moe-cb9f32546815)  
19.   
20. Llama3.3:70b vs GPT-OSS:20b for PHP Code Generation : r/LocalLLaMA \- Reddit, accessed March 11, 2026, [https://www.reddit.com/r/LocalLLaMA/comments/1ohyuci/llama3370b\_vs\_gptoss20b\_for\_php\_code\_generation/](https://www.reddit.com/r/LocalLLaMA/comments/1ohyuci/llama3370b_vs_gptoss20b_for_php_code_generation/)  
21. Why GPT-OSS 120B is Faster than Llama 3.3 70B? MoE Magic Crushes Dense Speed Limits \- Medium, accessed March 11, 2026, [https://medium.com/data-science-in-your-pocket/why-gpt-oss-120b-is-better-than-llama-3-3-70b-moe-magic-crushes-dense-speed-limits-d0bd43068a63](https://medium.com/data-science-in-your-pocket/why-gpt-oss-120b-is-better-than-llama-3-3-70b-moe-magic-crushes-dense-speed-limits-d0bd43068a63)  
22. gpt-oss:120b no longer obeying Reasoning Effort setting · Issue \#12589 \- GitHub, accessed March 11, 2026, [https://github.com/ollama/ollama/issues/12589](https://github.com/ollama/ollama/issues/12589)  
23. Modelfile Reference \- Ollama's documentation, accessed March 11, 2026, [https://docs.ollama.com/modelfile](https://docs.ollama.com/modelfile)  
24. gpt-oss:20b/template \- Ollama, accessed March 11, 2026, [https://ollama.com/library/gpt-oss:20b/blobs/51468a0fd901](https://ollama.com/library/gpt-oss:20b/blobs/51468a0fd901)  
25. Is GPT-OSS the meta for low vram setups? : r/LocalLLaMA \- Reddit, accessed March 11, 2026, [https://www.reddit.com/r/LocalLLaMA/comments/1mm8rqg/is\_gptoss\_the\_meta\_for\_low\_vram\_setups/](https://www.reddit.com/r/LocalLLaMA/comments/1mm8rqg/is_gptoss_the_meta_for_low_vram_setups/)  
26. you can disable thinking on gpt-oss models by adding this to prompt : r/LocalLLaMA \- Reddit, accessed March 11, 2026, [https://www.reddit.com/r/LocalLLaMA/comments/1miyysp/you\_can\_disable\_thinking\_on\_gptoss\_models\_by/](https://www.reddit.com/r/LocalLLaMA/comments/1miyysp/you_can_disable_thinking_on_gptoss_models_by/)  
27. guide : running gpt-oss with llama.cpp \#15396 \- GitHub, accessed March 11, 2026, [https://github.com/ggml-org/llama.cpp/discussions/15396](https://github.com/ggml-org/llama.cpp/discussions/15396)  
28. OpenClaw AI Agent Masterclass \- HelloPM, accessed March 11, 2026, [https://hellopm.co/openclaw-ai-agent-masterclass/](https://hellopm.co/openclaw-ai-agent-masterclass/)  
29. How OpenClaw Works: Understanding AI Agents Through a Real Architecture, accessed March 11, 2026, [https://bibek-poudel.medium.com/how-openclaw-works-understanding-ai-agents-through-a-real-architecture-5d59cc7a4764](https://bibek-poudel.medium.com/how-openclaw-works-understanding-ai-agents-through-a-real-architecture-5d59cc7a4764)  
30. I've encountered a strange bug \- Friends of the Crustacean \- Answer Overflow, accessed March 11, 2026, [https://www.answeroverflow.com/m/1480343602604277913](https://www.answeroverflow.com/m/1480343602604277913)  
31. \[Bug\]: reasoning.effort not forwarded to Ollama — only minimal thinking despite thinking=high \#13575 \- GitHub, accessed March 11, 2026, [https://github.com/openclaw/openclaw/issues/13575](https://github.com/openclaw/openclaw/issues/13575)  
32. \[Bug\]: OpenClaw expects content but Ollama reasoning models sends empty field · Issue \#27806 \- GitHub, accessed March 11, 2026, [https://github.com/openclaw/openclaw/issues/27806](https://github.com/openclaw/openclaw/issues/27806)  
33. Opus 4.6 Thinking Content Leaking to Discord \- Friends of the Crustacean, accessed March 11, 2026, [https://www.answeroverflow.com/m/1469832924776890449](https://www.answeroverflow.com/m/1469832924776890449)  
34. \[Bug\]: Matrix chat session ignores reasoning setting and prints all reasoning messages regardless · Issue \#24411 \- GitHub, accessed March 11, 2026, [https://github.com/openclaw/openclaw/issues/24668/linked\_closing\_reference?reference\_location=REPO\_ISSUES\_INDEX](https://github.com/openclaw/openclaw/issues/24668/linked_closing_reference?reference_location=REPO_ISSUES_INDEX)  
35. \[Bug\]: Thinking content leaks to channel even when thinking is disabled \#40736 \- GitHub, accessed March 11, 2026, [https://github.com/openclaw/openclaw/issues/40736](https://github.com/openclaw/openclaw/issues/40736)  
36. openclaw-prompts-and-skills/OPENCLAW\_SYSTEM\_PROMPT\_STUDY.md at main \- GitHub, accessed March 11, 2026, [https://github.com/seedprod/openclaw-prompts-and-skills/blob/main/OPENCLAW\_SYSTEM\_PROMPT\_STUDY.md](https://github.com/seedprod/openclaw-prompts-and-skills/blob/main/OPENCLAW_SYSTEM_PROMPT_STUDY.md)  
37. openclaw/docs/pi.md at main \- GitHub, accessed March 11, 2026, [https://github.com/openclaw/openclaw/blob/main/docs/pi.md](https://github.com/openclaw/openclaw/blob/main/docs/pi.md)  
38. Opus 4.6 plain-text thinking leaks to users (not caught by thinking-tag strip) \#33242 \- GitHub, accessed March 11, 2026, [https://github.com/openclaw/openclaw/issues/33242](https://github.com/openclaw/openclaw/issues/33242)  
39. Agent Loop \- OpenClaw, accessed March 11, 2026, [https://docs.openclaw.ai/concepts/agent-loop](https://docs.openclaw.ai/concepts/agent-loop)  
40. Two-layer memory plugin for OpenClaw: SpiceDB for authorization, Graphiti for knowledge graph storage. \- GitHub, accessed March 11, 2026, [https://github.com/Contextable/openclaw-memory-graphiti](https://github.com/Contextable/openclaw-memory-graphiti)  
41. newtro/ClawGuard: Security middleware for OpenClaw skills \- permission manifests, sandboxing, and audit logging \- GitHub, accessed March 11, 2026, [https://github.com/newtro/ClawGuard](https://github.com/newtro/ClawGuard)  
42. Breaking GPT-OSS: A brief investigation | by Michael Yu \- Medium, accessed March 11, 2026, [https://medium.com/@michaelyu713705/breaking-gpt-oss-a-brief-investigation-cf90178d0d68](https://medium.com/@michaelyu713705/breaking-gpt-oss-a-brief-investigation-cf90178d0d68)  
43. Open AI GPT-OSS:20b is bullshit : r/ollama \- Reddit, accessed March 11, 2026, [https://www.reddit.com/r/ollama/comments/1mij9gu/open\_ai\_gptoss20b\_is\_bullshit/](https://www.reddit.com/r/ollama/comments/1mij9gu/open_ai_gptoss20b_is_bullshit/)  
44. gpt-oss-120b & gpt-oss-20b Model Card \- arXiv.org, accessed March 11, 2026, [https://arxiv.org/html/2508.10925v1](https://arxiv.org/html/2508.10925v1)  
45. How to fine-tune OpenAI's gpt-oss-20b for industry defining applications. | by meta-hegel, accessed March 11, 2026, [https://medium.com/@meta-hegel/how-to-fine-tune-openais-gpt-oss-20b-for-industry-defining-applications-f04ffab66179](https://medium.com/@meta-hegel/how-to-fine-tune-openais-gpt-oss-20b-for-industry-defining-applications-f04ffab66179)  
46. Reasoning models struggle to control their chains of thought, and that's good | OpenAI, accessed March 11, 2026, [https://openai.com/index/reasoning-models-chain-of-thought-controllability/](https://openai.com/index/reasoning-models-chain-of-thought-controllability/)  
47. Reasoning \- GroqDocs \- Groq Console, accessed March 11, 2026, [https://console.groq.com/docs/reasoning](https://console.groq.com/docs/reasoning)  
48. Experimenting with Local LLMs on macOS \- Hacker News, accessed March 11, 2026, [https://news.ycombinator.com/item?id=45168953](https://news.ycombinator.com/item?id=45168953)  
49. Anyone mind briefing me on what exactly regex is and how I can use it on android for sillytavern? : r/SillyTavernAI \- Reddit, accessed March 11, 2026, [https://www.reddit.com/r/SillyTavernAI/comments/1b14ijh/anyone\_mind\_briefing\_me\_on\_what\_exactly\_regex\_is/](https://www.reddit.com/r/SillyTavernAI/comments/1b14ijh/anyone_mind_briefing_me_on_what_exactly_regex_is/)  
50. Regex | docs.ST.app \- SillyTavern Documentation, accessed March 11, 2026, [https://docs.sillytavern.app/extensions/regex/](https://docs.sillytavern.app/extensions/regex/)  
51. Reasoning | docs.ST.app \- SillyTavern Documentation, accessed March 11, 2026, [https://docs.sillytavern.app/usage/prompts/reasoning/](https://docs.sillytavern.app/usage/prompts/reasoning/)  
52. Gpt oss 20b templates : r/SillyTavernAI \- Reddit, accessed March 11, 2026, [https://www.reddit.com/r/SillyTavernAI/comments/1mlznl5/gpt\_oss\_20b\_templates/](https://www.reddit.com/r/SillyTavernAI/comments/1mlznl5/gpt_oss_20b_templates/)  
53. Fine-Tuning GPT-OSS for Serious Business, Part 2: Inference \- Medium, accessed March 11, 2026, [https://medium.com/@ceo\_44783/fine-tuning-gpt-oss-for-serious-business-part-2-inference-5f109e658378](https://medium.com/@ceo_44783/fine-tuning-gpt-oss-for-serious-business-part-2-inference-5f109e658378)  
54. \[Bug\]: Matrix chat session ignores reasoning setting and prints all reasoning messages regardless · Issue \#24411 \- GitHub, accessed March 11, 2026, [https://github.com/openclaw/openclaw/issues/24411](https://github.com/openclaw/openclaw/issues/24411)  
55. Test with GPT-OSS · Issue \#1068 · OpenHands/software-agent-sdk \- GitHub, accessed March 11, 2026, [https://github.com/All-Hands-AI/OpenHands/issues/10112](https://github.com/All-Hands-AI/OpenHands/issues/10112)