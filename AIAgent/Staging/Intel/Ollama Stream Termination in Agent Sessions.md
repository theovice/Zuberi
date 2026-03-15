# **Ollama API Stream Termination in Long-Running Agent Sessions: Comprehensive Diagnostic and Architectural Mitigation Report**

## **1\. Executive Summary**

The deployment of autonomous artificial intelligence agents for complex, long-horizon tasks introduces multifaceted challenges in state management, memory allocation, and network resilience. In the specified operational environment, a customized AI agent (Zuberi) operates via a Tauri v2 React frontend and an OpenClaw v2026.3.8 orchestration gateway. The system utilizes the native Ollama API to interface with the gpt-oss:20b large language model running on a Windows 11 host equipped with a 16 GB NVIDIA RTX 5070 Ti graphics processing unit. During extended research workflows—specifically when the agent executes multiple external tool calls to read extensive code files and subsequently attempts to synthesize a comprehensive markdown document—the system repeatedly encounters a catastrophic failure mode. This failure is defined by the error message: "Ollama API stream ended without a final response".1

The abrupt termination of the chunked HTTP stream results in the total loss of the active agentic turn, forcing the user to manually re-initiate the prompt within a constrained context.2 Exhaustive diagnostic telemetry indicates that this failure is not an isolated software bug, but rather a complex intersection of hardware memory boundaries, orchestrator token reserve mismanagement, network protocol timeouts, and the unique token-emission characteristics of the gpt-oss model's hidden reasoning architecture.3

This comprehensive research report delineates the exact mechanical causes of the stream termination anomaly. It explores the mathematical realities of Key-Value (KV) cache inflation, the behavioral mechanics of context window overflow, and the specific timeout protocols enforced by both the inference engine and the orchestrator. Furthermore, the analysis provides strict configuration adjustments to stabilize the infrastructure and proposes advanced architectural patterns designed to preserve stability and enable partial output recovery during extended autonomous execution.

## **2\. Anatomy of the Stream Termination Anomaly**

The error "Ollama API stream ended without a final response" is fundamentally a network-level symptom of a severe backend failure.1 When OpenClaw initiates a generation request to the native Ollama API (/api/chat or /api/generate), it establishes a persistent HTTP connection utilizing chunked transfer encoding.4 This allows the frontend React application to render tokens dynamically as they are produced by the inference engine.

Under normal operational parameters, the stream concludes when the model emits a designated end-of-sequence token, prompting the Ollama server to transmit a final JSON payload containing the flag done: true alongside detailed generation metrics.6 The OpenClaw parser actively monitors the stream for this specific termination sequence to formally close the turn and record the state.1

However, when the error occurs, the HTTP socket is abruptly severed by the host operating system before the done: true payload can be assembled and transmitted.1 Because OpenClaw operates on strict transactional boundaries, a severed connection without a clean termination flag is classified as a critical exception.8 The orchestrator discards the corrupted, incomplete text buffer to prevent state poisoning, resulting in the user-facing interface displaying the stream termination error and dropping the agent's turn entirely.2

The underlying causes for the Ollama server unexpectedly dropping the connection fall into three primary categories: hardware resource exhaustion triggering a subprocess crash, strict gateway timeouts triggered by model stalling, and context window threshold violations during mid-generation cycles.

## **3\. Hardware Constraints and the VRAM Exhaustion Vector**

The most critical factor contributing to the stream termination is the physical limitation of the host's graphics processing unit when subjected to maximum context utilization.3 The deployment utilizes an NVIDIA RTX 5070 Ti, which provides 16 GB of GDDR7 video random access memory (VRAM).10 While highly capable, this capacity represents a severe bottleneck for long-context generation with models exceeding 15 billion parameters.11

## **3.1 Model Weight Quantization and Memory Footprint**

The gpt-oss:20b model is built upon a Mixture-of-Experts (MoE) transformer architecture, possessing 20.9 billion total parameters and utilizing a routing mechanism that activates approximately 3.6 billion parameters per token during the forward pass.12 To facilitate deployment on consumer-grade hardware, OpenAI and partnered distribution networks natively quantize the model weights into the MXFP4 format.13

In the MXFP4 format, the static model weights occupy approximately 13 GB to 14 GB of VRAM.13 Consequently, when the model is loaded entirely into the GPU to ensure high-performance token generation, the remaining VRAM budget available for dynamic memory allocation is restricted to a mere 2 GB to 3 GB.3

## **3.2 Key-Value (KV) Cache Mathematical Projections**

During autoregressive generation, language models must store the intermediate attention representations for every token processed in the prompt and every token generated in the response. This memory structure is known as the Key-Value (KV) cache.15 The KV cache grows linearly with the context length, and its size is a function of the model's architectural dimensions and the chosen precision format.15

The KV cache size in bytes can be calculated using the foundational attention memory formula. For the gpt-oss:20b architecture, the structural parameters are defined as follows:

* Total layers: 24 3  
* Key-Value attention heads: 8 (utilizing Grouped-Query Attention for efficiency) 3  
* Head dimension: 64 3  
* Tokens: 131,072 (the maximum configured context window) 17

By default, the Ollama inference engine allocates the KV cache using 16-bit floating-point precision (FP16), which requires 2 bytes per element.3

The resulting calculation for a fully saturated 131K context window is:

![][image1]  
A 6.44 GB KV cache strictly exceeds the 2 to 3 GB of residual VRAM available on the RTX 5070 Ti.3

## **3.3 The Silent Out-of-Memory (OOM) Crash**

During the initial phases of the research task, the agent executes isolated tool calls to read file contents. Because the context window is relatively small at the beginning of the session, the dynamic KV cache easily fits within the remaining VRAM.15 The agent successfully processes multiple 200-line files, gradually filling the memory.11

However, during the final synthesis step, the agent must process the entirety of the accumulated history and begin generating a long, complex markdown document. As the generated tokens push the context length closer to the 131K boundary, the KV cache expands beyond the physical limits of the GDDR7 memory.11

When the underlying llama.cpp runner process requests additional memory allocation and the CUDA driver reports an out-of-memory condition (cudaMalloc failed: out of memory), the runner process immediately panics and terminates with an exit status 2 or error:fault.18 Because the runner process acts as the engine driving the API response, its sudden death causes the overarching Ollama server to forcefully close the active HTTP stream connected to OpenClaw.20 The orchestrator interprets this abrupt disconnection precisely as a stream that ended without a final response.1

## **4\. Context Window Dynamics and the Harmony Format**

Beyond strict hardware exhaustion, the unique behavioral characteristics of the gpt-oss:20b model actively accelerate the system toward both memory boundaries and algorithmic context limits. This acceleration is heavily dependent on OpenAI's proprietary "Harmony" response format, which dictates how the model structures its internal logic and external outputs.22

## **4.1 Token Inflation via the Analysis Channel**

The Harmony format requires the model to partition its responses into distinct communication channels using specific control tokens: \<|channel|\>analysis for internal Chain of Thought (CoT) reasoning, \<|channel|\>commentary for executing external function calls, and \<|channel|\>final for generating the user-facing text.22

When the orchestrator tasks the agent with synthesizing a long document based on multiple large code files, the model initiates its response in the analysis channel.22 In this hidden channel, the model engages in extensive, multi-step reasoning to plan the structure of the document, verify the logic of the code files, and evaluate potential edge cases.22

This internal monologue represents a massive, largely invisible multiplier on actual token consumption.25 A synthesis output that appears to require only 2,000 visible markdown tokens may actually be preceded by 6,000 to 8,000 tokens of hidden analysis text. From the perspective of the user observing the ZuberiChat frontend, the model appears to be generating a moderately sized response. However, from the perspective of the VRAM allocator and the context window boundary, the model is consuming tokens at an exponential rate.26

## **4.2 Mid-Stream Context Boundary Collisions**

The interaction between this hidden token inflation and the maximum context window is a primary catalyst for stream termination. The environment is configured with a 131K context window, matching the model's native capability.14

During standard operation, if a user prompt exceeds the context window, the inference engine typically rejects the request outright before generation begins. However, the critical failure mode occurs when a request is initiated near the boundary, and the generation process crosses the absolute threshold mid-stream.27

When gpt-oss:20b reaches the 131,072nd token while still deep inside an analysis loop or mid-way through a final channel output, Ollama does not possess an algorithmic mechanism to gracefully pause the generation, request a compaction from the orchestrator, and resume.27 Instead, hitting the absolute end of the allocated memory buffer during active generation triggers undefined behavior within the tensor operations, frequently resulting in a segmentation fault or a forced loop termination that drops the HTTP stream without appending the required termination JSON payload.27

## **5\. Orchestrator Mechanics: Compaction and Timeout Protocols**

While the underlying hardware and inference engine dictate the physical limits, the OpenClaw orchestrator controls the flow of data. Misalignments in OpenClaw's session management protocols actively force the inference engine into dangerous edge cases, exacerbating the stream termination anomaly.

## **5.1 Compaction Threshold Misalignment**

OpenClaw prevents context overflow through an automated compaction algorithm. Rather than allowing the context to grow indefinitely, the orchestrator tracks token usage and rewrites the conversation history into a condensed summary when the context nears capacity.29

This behavior is governed by the reserveTokensFloor parameter, which establishes a strict minimum buffer that must remain empty to accommodate the model's anticipated response.29 The user's environment is currently configured with reserveTokensFloor: 4000\.29

In a standard chatbot interaction, a 4,000-token reserve is more than adequate for short conversational replies. However, in a multi-file research and synthesis scenario leveraging the gpt-oss:20b Harmony architecture, a 4,000-token reserve is mathematically disastrous.5 If the accumulated context reaches 126,000 tokens, OpenClaw calculates that 5,000 tokens remain available. Because 5,000 is greater than the 4,000-token floor, OpenClaw bypasses the compaction routine and submits the massive prompt to Ollama.5

The model immediately begins its hidden analysis channel reasoning, consuming 3,000 tokens just to plan the document. It then transitions to the final channel to write the markdown. At exactly 2,000 tokens into the user-facing response, the generation violently collides with the 131K boundary. Because OpenClaw's compaction only fires *between* turns and cannot intercept an active generation stream, the prompt is doomed to crash before it even begins.31

## **5.2 Gateway and Inference Timeout Paradigms**

Long-running agentic sessions are highly susceptible to network timeouts, particularly when the model is engaged in extensive, silent reasoning.4 Two independent timeout mechanisms govern the stream stability:

**OpenClaw Request Timeouts** The OpenClaw gateway enforces a strict duration limit on any single inference request via the timeoutSeconds configuration.33 When generating text on an RTX 5070 Ti, the processing speed (tokens per second) degrades significantly as the context window fills, dropping from 40+ tokens per second at 4K context down to single digits as the cache saturates the memory bandwidth.11 If a highly complex synthesis task requires 8,000 total tokens (analysis \+ final) and the generation speed drops to 5 tokens per second, the turn will take over 26 minutes to complete. If the OpenClaw timeoutSeconds parameter is set to a default value (e.g., 300 or 600 seconds), the gateway will forcibly sever the connection, logging a stream termination error despite the model operating correctly.4

**Ollama Keep-Alive Volatility** Simultaneously, the Ollama server daemon manages VRAM allocation through an idle timeout mechanism dictated by the OLLAMA\_KEEP\_ALIVE variable, which defaults to 5 minutes.34 During a multi-step agent workflow, there may be periods where OpenClaw is parsing tool results, downloading web assets, or awaiting user confirmation. If this idle period exceeds 5 minutes, Ollama automatically unloads the 13 GB gpt-oss:20b weights from the GPU to free resources.35

When OpenClaw submits the final synthesis prompt, Ollama must reload the massive model from the solid-state drive back into the GDDR7 VRAM before it can generate the first token.35 This cold-start initialization can take 10 to 15 seconds. This prolonged latency frequently triggers OpenClaw's connection initialization timeouts, resulting in the connection being abandoned before the stream can even commence, yielding an identical termination error.4

## **6\. Strategic Mitigation and Configuration Parameters**

Resolving the stream termination anomaly requires a synchronized recalibration of both the inference backend (Ollama) and the orchestration gateway (OpenClaw). The objective is to aggressively constrain VRAM consumption, permanently pin the model to memory, vastly expand the safety thresholds for context management, and align network timeouts with the realities of long-horizon synthesis.

## **6.1 Ollama Inference Optimization**

To eliminate the silent out-of-memory crashes caused by the Key-Value cache exceeding the 16 GB hardware limitation, the cache must be mathematically reduced.

| Environment Variable | Target Value | Strategic Rationale |
| :---- | :---- | :---- |
| OLLAMA\_KV\_CACHE\_TYPE | q8\_0 | Compresses the FP16 KV cache to 8-bit precision. This explicitly halves the memory footprint of the 131K context window from \~6.4 GB to \~3.2 GB, allowing it to reside safely alongside the 13 GB model weights on a 16 GB GPU. The impact on perplexity and reasoning quality at q8\_0 is statistically negligible for standard synthesis tasks.16 |
| OLLAMA\_KEEP\_ALIVE | \-1 | Instructs the Ollama daemon to pin the loaded model weights in the GPU memory indefinitely. This entirely eradicates the cold-start loading latency that triggers connection timeouts during intermittent agent workflows.34 |
| OLLAMA\_FLASH\_ATTENTION | 1 | Forces the use of Flash Attention algorithms, which optimize memory bandwidth utilization and prevent severe token-per-second degradation as the context window approaches maximum capacity.15 |

These variables must be injected into the system environment where the Ollama Windows 11 host process executes. Depending on the installation method, this requires setting the variables at the System level via the advanced Windows Control Panel, or injecting them into the PowerShell profile prior to executing the ollama serve binary.34

## **6.2 OpenClaw Gateway Tuning**

The orchestrator must be reconfigured to preemptively protect the model from context collisions and to exhibit high tolerance for slow generation phases. These modifications must be applied to the openclaw.json configuration file located within the Docker container's mounted volume.

| Configuration Key | Target Value | Strategic Rationale |
| :---- | :---- | :---- |
| agents.defaults.compaction.reserveTokensFloor | 25000 | Expands the absolute minimum context buffer. OpenClaw will now intercept the session and trigger summarization the moment the active context exceeds 106,000 tokens (131K \- 25K). This guarantees that the gpt-oss:20b model will always possess a massive 25,000-token runway dedicated entirely to its hidden analysis channel and the final markdown synthesis, mathematically eliminating mid-stream context boundary crashes.29 |
| agents.defaults.compaction.softThresholdTokens | 4000 | Instructs OpenClaw to begin warning the agent and preparing for memory flushes earlier in the cycle, ensuring a smoother transition during long document reading.40 |
| agents.defaults.timeoutSeconds | 1800 | Extends the internal API watchdog timer to 30 minutes. This provides the orchestrator with extreme tolerance for slow generation speeds inherent to running MoE models at full context saturation, ensuring the network socket is not forcefully closed during complex reasoning.33 |

## **6.3 Reasoning Suppression via Modelfile**

While the Harmony format's internal monologue cannot be entirely disabled without severely degrading the model's intelligence, its verbosity must be constrained to limit token inflation. gpt-oss models interpret reasoning instructions directly from their system prompts rather than boolean API flags.26

By creating a localized Modelfile, the user can enforce a strict maximum bound on the model's analytical depth.

FROM gpt-oss:20b

PARAMETER num\_ctx 131072

SYSTEM """

You are an expert synthesis agent designed for high-efficiency data aggregation.

Reasoning: low

Maintain strict adherence to the final output request and avoid extensive internal planning.

"""

Executing ollama create zuberibot \-f Modelfile establishes a distinct model alias. Instructing OpenClaw to target this specific alias ensures the model restricts its \<|channel|\>analysis bloat to the absolute minimum required for coherence, directly conserving both VRAM capacity and context space.26

## **7\. Architectural Refactoring for Extended Agentic Workflows**

Even with an aggressively optimized KV cache and highly tuned compaction thresholds, relying on a single, monolithic context window to ingest thousands of lines of raw code is an architectural anti-pattern. Operating perpetually near the absolute hardware limits of a 16 GB GPU will inherently produce brittle workflows.

To ensure absolute stability across infinitely long research tasks, the agent's behavioral framework must be restructured. The system must transition from naive data accumulation to sophisticated, iterative state distillation.31

## **7.1 The "Read-Summarize-Flush" Design Pattern**

The current operational failure stems from the agent executing multiple read or exec commands and retaining the entirety of the 200+ line outputs in its active, short-term conversational context.31 This raw data rapidly balloons token usage.

System prompts within the OpenClaw configuration must be augmented to enforce a map-reduce methodology:

1. **Isolated Ingestion:** The agent is instructed to read a single target file.  
2. **Immediate Distillation:** Rather than allowing the raw code to persist in the chat transcript, the agent must immediately parse the file, extract the relevant functions, architectures, or variables requested by the user, and synthesize a dense summary.  
3. **State Persistence:** The agent writes this highly compressed summary to a persistent, localized scratchpad within its workspace (e.g., workspace/distilled\_research.md or OpenClaw's native MEMORY.md).40  
4. **Proactive State Clearing:** The agent is given explicit permission to utilize the /compact or /reset commands to flush the raw file contents from its short-term memory.31  
5. **Final Synthesis:** When all files have been analyzed, the agent initiates the final synthesis by reading only the localized distilled\_research.md file, which contains merely a few thousand tokens of dense insight rather than a hundred thousand tokens of raw, unstructured code.

This architectural shift mathematically guarantees that the active context window remains minimal, fundamentally bypassing the VRAM constraints that cause the stream termination.

## **7.2 Leveraging Automated Memory Flushes**

OpenClaw v2026.3.8 incorporates a robust memoryFlush capability specifically designed to complement iterative workflows.40 When activated in the configuration, this mechanism monitors the context limit. As the conversation crosses the softThresholdTokens boundary, the gateway autonomously injects a hidden system prompt before forcing a compaction cycle.

The prompt states: *"Session nearing compaction. Store durable memories now. Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO\_REPLY if nothing to store."*.40

By ensuring this feature is enabled, the agent is provided a programmatic safety net. If a user forces the agent to read too many files consecutively without manual resets, the system will automatically pause, grant the model a brief window to dump its critical findings to the physical disk, and then safely summarize the history.40 This prevents the loss of vital research data during automated context pruning.

## **8\. Telemetry and Partial Output Recovery Mechanisms**

When a stream termination occurs despite all optimizations—typically due to an unforeseen network fluctuation or a localized driver crash—the loss of a 20-minute synthesis generation is catastrophic to user productivity. Standard web interfaces and React applications are designed to drop the message bubble entirely if the JSON payload is not cleanly finalized by a trailing stop sequence.9

However, because the native Ollama API relies on streaming chunked data, the partial text *was* successfully transmitted over the network millisecond by millisecond prior to the crash. Recovering this lost data is entirely feasible through specific diagnostic logging and frontend alignment.44

## **8.1 Raw Stream Extraction Protocol**

OpenClaw can be configured to act as a transparent diagnostic proxy, buffering every individual network event received from the inference provider directly to the host storage. This guarantees that even if the internal state machine fails to construct a complete message object, the raw tokens are preserved.44

By setting the environment variable OPENCLAW\_RAW\_STREAM=1 within the OpenClaw Docker container, the orchestrator writes a continuous stream of raw JSON objects to a dedicated diagnostic file located at \~/.openclaw/logs/raw-stream.jsonl.44

If a catastrophic stream termination occurs during a critical synthesis, an operator can immediately access this .jsonl file. The file will contain the exact sequence of tokens generated up to the exact moment of the CUDA failure. Because the gpt-oss model interleaves its output with Harmony tags, a simple regular expression script (e.g., matching the contents between \<|channel|\>final\<|message|\> and the end of the file) can be utilized to strip the JSON formatting and recover the plain text, allowing the user to salvage the partial report.45

## **8.2 Frontend Preservation and Streaming Modes**

The architectural design of the channel integration dictates how partial failures are handled visually. If a channel is configured for "block" streaming, it waits for the entire generation to conclude before rendering the text; a failure results in total silence.44

To ensure the ZuberiChat Tauri frontend retains data upon failure, the connection interface must strictly enforce partial delivery semantics. OpenClaw supports configuring specific channels to utilize streamMode: "partial".9 This configuration forces the orchestrator to emit real-time text updates to the frontend state management system.

Furthermore, tracking the specific versioning of the OpenClaw repository is vital. Recent patches in the OpenClaw ecosystem, particularly starting around version v2026.3.12, actively addressed the preservation of partial output upon network aborts, ensuring that the final UI state retains the appended text rather than reverting to a blank buffer when the stream exception is thrown.46 Maintaining the orchestrator at the bleeding edge of the stable release branch guarantees the most resilient handling of unexpected socket closures, minimizing user friction during complex autonomous tasks.

#### **Works cited**

1. Ollama API stream ended without a final response (Trouble shooting tutorial) \- Friends of the Crustacean \- Answer Overflow, accessed March 13, 2026, [https://www.answeroverflow.com/m/1477815671583936703](https://www.answeroverflow.com/m/1477815671583936703)  
2. Struggling with inital deployment \- Friends of the Crustacean \- Answer Overflow, accessed March 13, 2026, [https://www.answeroverflow.com/m/1479893812469039206?cursor=B-Oo60lftnqzi5HWxayJvd1RQezVfTQqOAzGMIVhbV\_YenW4-SdvgemAvFqfRuX0DcmfVHWemXhpSdItq8olDkws7zF-vcT0QIIUT53RaA8a8DvLwOxkzJKUq5TQE3TUB80fdZfjebv2dJoWsEajgGv36UnKR-c7-XTfgZb5caxG15weMqpqwqUDFXg](https://www.answeroverflow.com/m/1479893812469039206?cursor=B-Oo60lftnqzi5HWxayJvd1RQezVfTQqOAzGMIVhbV_YenW4-SdvgemAvFqfRuX0DcmfVHWemXhpSdItq8olDkws7zF-vcT0QIIUT53RaA8a8DvLwOxkzJKUq5TQE3TUB80fdZfjebv2dJoWsEajgGv36UnKR-c7-XTfgZb5caxG15weMqpqwqUDFXg)  
3. GPT-OSS:20B running almost entirely on CPU · Issue \#11731 · ollama/ollama \- GitHub, accessed March 13, 2026, [https://github.com/ollama/ollama/issues/11731](https://github.com/ollama/ollama/issues/11731)  
4. Issue with remote Ollama over LAN \- Friends of the Crustacean \- Answer Overflow, accessed March 13, 2026, [https://www.answeroverflow.com/m/1480022997447475483](https://www.answeroverflow.com/m/1480022997447475483)  
5. Anyone have an idea why my agents default back to my brains model? I'm using sonnet for my brain but \- Friends of the Crustacean \- Answer Overflow, accessed March 13, 2026, [https://www.answeroverflow.com/m/1472064652082024512?cursor=B0GR3cc\_g3bznw\_FxnwuAatWtNkK7DoUhGaUSN3eK9O6yBUcmis1YycbO0vZyU4Z70DYfgHub5HvBGw57sZ2xkoJo2LR-DHW1Pg9QfVU429XtRIFyecT7BYFuEGNFp3wiJ2\_Vgm-VfITGagVJ8vXJ1lh6WKN4yARxyVxKEJ1Oit62K5cGf5q4Q6GbCc](https://www.answeroverflow.com/m/1472064652082024512?cursor=B0GR3cc_g3bznw_FxnwuAatWtNkK7DoUhGaUSN3eK9O6yBUcmis1YycbO0vZyU4Z70DYfgHub5HvBGw57sZ2xkoJo2LR-DHW1Pg9QfVU429XtRIFyecT7BYFuEGNFp3wiJ2_Vgm-VfITGagVJ8vXJ1lh6WKN4yARxyVxKEJ1Oit62K5cGf5q4Q6GbCc)  
6. Errors \- Ollama's documentation, accessed March 13, 2026, [https://docs.ollama.com/api/errors](https://docs.ollama.com/api/errors)  
7. Running Large Language Models Locally Using Ollama \- codemag.com, accessed March 13, 2026, [https://www.codemag.com/Article/264031/Running-Large-Language-Models-Locally-Using-Ollama](https://www.codemag.com/Article/264031/Running-Large-Language-Models-Locally-Using-Ollama)  
8. Session Management Deep Dive \- OpenClaw Docs, accessed March 13, 2026, [https://docs.openclaw.ai/reference/session-management-compaction](https://docs.openclaw.ai/reference/session-management-compaction)  
9. Telegram streaming preview loses pre-tool text in partial mode (group topics & DMs) \#19275, accessed March 13, 2026, [https://github.com/openclaw/openclaw/issues/19275](https://github.com/openclaw/openclaw/issues/19275)  
10. NVIDIA GeForce RTX 5070 Ti Specs \- GPU Database \- TechPowerUp, accessed March 13, 2026, [https://www.techpowerup.com/gpu-specs/geforce-rtx-5070-ti.c4243](https://www.techpowerup.com/gpu-specs/geforce-rtx-5070-ti.c4243)  
11. Context Kills VRAM: How to Run LLMs on consumer GPUs | by Lyx | Medium, accessed March 13, 2026, [https://medium.com/@lyx\_62906/context-kills-vram-how-to-run-llms-on-consumer-gpus-a785e8035632](https://medium.com/@lyx_62906/context-kills-vram-how-to-run-llms-on-consumer-gpus-a785e8035632)  
12. gpt-oss-120b & gpt-oss-20b Model Card \- OpenAI, accessed March 13, 2026, [https://cdn.openai.com/pdf/419b6906-9da6-406c-a19d-1bb078ac7637/oai\_gpt-oss\_model\_card.pdf](https://cdn.openai.com/pdf/419b6906-9da6-406c-a19d-1bb078ac7637/oai_gpt-oss_model_card.pdf)  
13. GPT-OSS 20B: Specifications and GPU VRAM Requirements \- ApX Machine Learning, accessed March 13, 2026, [https://apxml.com/models/gpt-oss-20b](https://apxml.com/models/gpt-oss-20b)  
14. gpt-oss:20b \- Ollama, accessed March 13, 2026, [https://ollama.com/library/gpt-oss:20b](https://ollama.com/library/gpt-oss:20b)  
15. Ollama VRAM Requirements: Complete 2026 Guide to GPU Memory for Local LLMs, accessed March 13, 2026, [https://localllm.in/blog/ollama-vram-requirements-for-local-llms](https://localllm.in/blog/ollama-vram-requirements-for-local-llms)  
16. 8 local LLM settings most people never touch that fixed my worst AI problems \- XDA, accessed March 13, 2026, [https://www.xda-developers.com/local-llm-settings-most-people-never-touch/](https://www.xda-developers.com/local-llm-settings-most-people-never-touch/)  
17. config.json · openai/gpt-oss-20b at main \- Hugging Face, accessed March 13, 2026, [https://huggingface.co/openai/gpt-oss-20b/blob/main/config.json](https://huggingface.co/openai/gpt-oss-20b/blob/main/config.json)  
18. Ollama Runner Fails with “Exit Status 2” and Random Non-Responsive Behavior on Windows \#12940 \- GitHub, accessed March 13, 2026, [https://github.com/ollama/ollama/issues/12940](https://github.com/ollama/ollama/issues/12940)  
19. Ollama 0.12.9 Windows \- 500: llama runner process has terminated: cudaMalloc failed: out of memory \- GitHub, accessed March 13, 2026, [https://github.com/ollama/ollama/issues/12982](https://github.com/ollama/ollama/issues/12982)  
20. llama runner process has terminated: error:fault \#11341 \- GitHub, accessed March 13, 2026, [https://github.com/ollama/ollama/issues/11341](https://github.com/ollama/ollama/issues/11341)  
21. ollama not working with my amdgpu. is there a previous version curl command i can use? \- Reddit, accessed March 13, 2026, [https://www.reddit.com/r/ollama/comments/1ok9n15/ollama\_not\_working\_with\_my\_amdgpu\_is\_there\_a/](https://www.reddit.com/r/ollama/comments/1ok9n15/ollama_not_working_with_my_amdgpu_is_there_a/)  
22. OpenAI Harmony Response Format, accessed March 13, 2026, [https://developers.openai.com/cookbook/articles/openai-harmony/](https://developers.openai.com/cookbook/articles/openai-harmony/)  
23. kultivator-consulting/goharmony: A Go implementation of the OpenAI Harmony format parser for structured LLM responses. \- GitHub, accessed March 13, 2026, [https://github.com/kultivator-consulting/goharmony](https://github.com/kultivator-consulting/goharmony)  
24. Build a Weather Assistant with OpenAI GPT-OSS and Harmony SDK on Vast.ai, accessed March 13, 2026, [https://vast.ai/article/build-a-weather-assistant-with-openai-gpt-oss-and-harmony-sdk-on-vast-ai](https://vast.ai/article/build-a-weather-assistant-with-openai-gpt-oss-and-harmony-sdk-on-vast-ai)  
25. Quant Fever, Reasoning Blackholes, Schrodinger's Compliance, and More: Probing GPT‑OSS‑20B \- arXiv.org, accessed March 13, 2026, [https://arxiv.org/html/2509.23882](https://arxiv.org/html/2509.23882)  
26. Thinking \- Ollama's documentation, accessed March 13, 2026, [https://docs.ollama.com/capabilities/thinking](https://docs.ollama.com/capabilities/thinking)  
27. OOM errors for large context models can be solved by reducing 'num\_batch' down from the default of 512 · Issue \#1800 \- GitHub, accessed March 13, 2026, [https://github.com/ollama/ollama/issues/1800](https://github.com/ollama/ollama/issues/1800)  
28. When the context window is exceeded, what happens to the data fed into the model? : r/ollama \- Reddit, accessed March 13, 2026, [https://www.reddit.com/r/ollama/comments/1j0pls3/when\_the\_context\_window\_is\_exceeded\_what\_happens/](https://www.reddit.com/r/ollama/comments/1j0pls3/when_the_context_window_is_exceeded_what_happens/)  
29. openclaw-gateway-sessions | Skills M... \- LobeHub, accessed March 13, 2026, [https://lobehub.com/skills/kyle-deprow-g2\_openclaw-openclaw-gateway-sessions](https://lobehub.com/skills/kyle-deprow-g2_openclaw-openclaw-gateway-sessions)  
30. Deep Dive: How OpenClaw's Memory System Works \- Kuma Blog | Study Notes, accessed March 13, 2026, [https://snowan.gitbook.io/study-notes/ai-blogs/openclaw-memory-system-deep-dive](https://snowan.gitbook.io/study-notes/ai-blogs/openclaw-memory-system-deep-dive)  
31. Fix OpenClaw context\_length\_exceeded: Complete Troubleshooting Guide \[2026\], accessed March 13, 2026, [https://blog.laozhang.ai/en/posts/openclaw-context-length-exceeded](https://blog.laozhang.ai/en/posts/openclaw-context-length-exceeded)  
32. Memory flush softThresholdTokens doesn't scale with context window size · Issue \#17034 \- GitHub, accessed March 13, 2026, [https://github.com/openclaw/openclaw/issues/17034](https://github.com/openclaw/openclaw/issues/17034)  
33. How do i update the timeout? \- Friends of the Crustacean \- Answer Overflow, accessed March 13, 2026, [https://www.answeroverflow.com/m/1478979026331762781](https://www.answeroverflow.com/m/1478979026331762781)  
34. FAQ \- Ollama, accessed March 13, 2026, [https://docs.ollama.com/faq](https://docs.ollama.com/faq)  
35. How to Speed Up Ollama Performance \- Database Mart, accessed March 13, 2026, [https://www.databasemart.com/kb/how-to-speed-up-ollama-performance](https://www.databasemart.com/kb/how-to-speed-up-ollama-performance)  
36. keep\_alive and OLLAMA\_KEEP\_ALIVE not effective · Issue \#5272 · ollama/ollama \- GitHub, accessed March 13, 2026, [https://github.com/ollama/ollama/issues/5272](https://github.com/ollama/ollama/issues/5272)  
37. Ollama has merged in K/V cache quantisation support, halving the memory used by the context \- Reddit, accessed March 13, 2026, [https://www.reddit.com/r/LocalLLaMA/comments/1h62u1p/ollama\_has\_merged\_in\_kv\_cache\_quantisation/](https://www.reddit.com/r/LocalLLaMA/comments/1h62u1p/ollama_has_merged_in_kv_cache_quantisation/)  
38. Quickstart Guide: Ollama With GPU Support (No ROCM Needed) \- Framework Community, accessed March 13, 2026, [https://community.frame.work/t/quickstart-guide-ollama-with-gpu-support-no-rocm-needed/79186](https://community.frame.work/t/quickstart-guide-ollama-with-gpu-support-no-rocm-needed/79186)  
39. My personal experience is that GLM 5 is really good, but sufficiently slow that it's only useful for \- Friends of the Crustacean \- Answer Overflow, accessed March 13, 2026, [https://www.answeroverflow.com/m/1472112278903062666](https://www.answeroverflow.com/m/1472112278903062666)  
40. Memory \- OpenClaw Docs, accessed March 13, 2026, [https://docs.openclaw.ai/concepts/memory](https://docs.openclaw.ai/concepts/memory)  
41. Just try gpt-oss:20b : r/ollama \- Reddit, accessed March 13, 2026, [https://www.reddit.com/r/ollama/comments/1r2ex9k/just\_try\_gptoss20b/](https://www.reddit.com/r/ollama/comments/1r2ex9k/just_try_gptoss20b/)  
42. OpenClaw's Most Comprehensive Tutorial \- The Ultimate Guide to Advanced Techniques, accessed March 13, 2026, [https://www.tencentcloud.com/techpedia/141564](https://www.tencentcloud.com/techpedia/141564)  
43. How to use OpenClaw for research (data collection, analysis, report writing) \- Tencent Cloud, accessed March 13, 2026, [https://www.tencentcloud.com/techpedia/141442](https://www.tencentcloud.com/techpedia/141442)  
44. Telegram streaming/preview not working in OpenClaw \- Friends of the Crustacean, accessed March 13, 2026, [https://www.answeroverflow.com/m/1473046284264013945](https://www.answeroverflow.com/m/1473046284264013945)  
45. Fine-Tuning GPT-OSS for Serious Business, Part 2: Inference \- Medium, accessed March 13, 2026, [https://medium.com/@ceo\_44783/fine-tuning-gpt-oss-for-serious-business-part-2-inference-5f109e658378](https://medium.com/@ceo_44783/fine-tuning-gpt-oss-for-serious-business-part-2-inference-5f109e658378)  
46. Releases · openclaw/openclaw \- GitHub, accessed March 13, 2026, [https://github.com/openclaw/openclaw/releases](https://github.com/openclaw/openclaw/releases)  
47. 上游更新: v2026.2.15 — 25 P0 \+ 26 P1 待合并\#96 \- GitHub, accessed March 13, 2026, [https://github.com/jiulingyun/openclaw-cn/issues/96](https://github.com/jiulingyun/openclaw-cn/issues/96)

[image1]: <data:image/png;base64,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>