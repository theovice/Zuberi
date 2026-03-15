# **Architectural Analysis and Remediation Strategy for the OpenClaw Execution Approval Pipeline**

The integration of local autonomous agents into desktop environments necessitates a robust, fail-safe mechanism for executing host-level commands. Within the specified environment—comprising the OpenClaw v2026.3.8 gateway, the Ollama inference engine, the gpt-oss:20b local model utilizing the Harmony format, and the React-based ZuberiChat frontend via a Tauri v2 architecture—a critical degradation in the execution approval pipeline has been identified. Despite prior remediation efforts, including WebSocket queuing mechanisms and read-only auto-approval policies, the system continues to exhibit severe synchronization failures. These failures manifest as the rapid stacking of approval dialogs, successful user confirmations failing to trigger tool execution, and the underlying language model entering infinite retry loops.

The underlying pathology is not a single point of failure but a complex interplay between asynchronous event handling in the OpenClaw gateway, state management drift within the React frontend, and the specific generative behaviors of the gpt-oss:20b model when confronted with non-blocking intermediate tool states. This comprehensive analysis evaluates the execution approval protocol from end to end, dissects the exact mechanics of the synchronization failures, assesses the generative patterns of the Harmony format, and establishes a definitive architectural restructuring to achieve absolute reliability within the constraints of the existing technology stack.

## **The OpenClaw Execution Approval Protocol Lifecycle**

To diagnose the failure path accurately, the baseline mechanics of the OpenClaw execution approval protocol must be established. The protocol acts as a non-blocking safety interlock designed to pause high-risk actions until explicit operator consent is granted, bridging the gap between autonomous intent and host security.1

When a sandboxed agent attempts to execute a command on the gateway or node host, the OpenClaw exec tool evaluates the request against a multi-layered authorization model.2 The effective policy is calculated as the stricter of the tools.exec.\* configuration defined in the primary openclaw.json and the host-level definitions within the local exec-approvals.json configuration file.1 The operational status is heavily dictated by parameters such as security (often set to allowlist) and ask (often set to on-miss).1

If the policy dictates that human-in-the-loop intervention is required, the gateway halts the execution. Crucially, the execution tool does not block the primary agent event loop to await a human response.2 Instead, the tool returns immediately to the agent session with a specific payload status of approval-pending, alongside a unique cryptographically generated approval identifier.2

Simultaneous to returning this pending status to the agent, the OpenClaw gateway initiates an asynchronous broadcast over all connected, authenticated operator WebSockets. The gateway emits an exec.approval.requested event, providing the client interface with the requisite context to render an approval dialog.3

The anticipated JSON schema for the broadcasted payload enforces a strict structural hierarchy, defined by the following primary parameters:

| Top-Level Field | Data Type | Operational Function |
| :---- | :---- | :---- |
| id | String | The definitive UUID for the approval instance, required for the resolution RPC. |
| request | Object | The contextual payload containing the execution parameters and targeting data. |
| createdAtMs | Number | Epoch timestamp indicating the exact millisecond of the request creation. |
| expiresAtMs | Number | Epoch timestamp dictating the absolute threshold for automatic gateway denial. |

The nested request object further specifies the command details necessary for user evaluation:

| Nested Request Field | Data Type | Operational Function |
| :---- | :---- | :---- |
| command | String | The base executable binary being invoked by the agent (e.g., ls, npm). |
| commandArgv | Array of Strings | The ordered list of arguments appended to the base command. |
| cwd | String / Null | The working directory target for the execution context. |
| nodeId | String / Null | The target node identifier, applicable in distributed setups. |
| host | String / Null | Indicates the execution environment, typically resolving to gateway or node. |

By default, if the requesting component does not supply an explicit timeout parameter upon invocation, the OpenClaw gateway enforces a hardcoded 120,000-millisecond expiration window.5 If this window elapses without a corresponding resolution Remote Procedure Call from the client, the gateway automatically updates the internal state to a denial, categorized under the reason approval-timeout, and emits this status back to the agent session.3

## **Gateway Handling of Concurrent and Duplicate Requests**

The visual symptom of rapid approval card stacking on the ZuberiChat interface points directly to a lack of deduplication at the gateway level combined with the model's retry behavior. The OpenClaw gateway is architected to support high-throughput concurrent orchestration. When processing tool calls, the execution bridge treats every incoming request as a distinct, isolated operational instance.3

When the model fails to wait for the resolution of a pending command and decides to re-issue the exact same tool call, the OpenClaw gateway does not perform signature matching or deduplication. If the model fires identical commands five times in rapid succession, the gateway allocates five independent UUIDs, caches five independent expiration timers in memory, and broadcasts five distinct exec.approval.requested events over the WebSocket channel.3

This independent session architecture creates a critical operational race condition. If the user interacts with the third approval card rendered on the interface, transmitting an exec.approval.resolve targeted at UUID \#3, the gateway executes the third instance of the command.5 However, the requests associated with UUID \#1, \#2, \#4, and \#5 remain fully pending in the gateway's memory, silently ticking toward their 120-second expiration threshold.

Because the language model's context window relies on sequential chronological processing, it anticipates the resolution of its most recent attempt (UUID \#5) as its active working state. When the gateway emits an Exec finished system event tagged with runId: \#3 following the user's approval, the model may fail to correlate the success of a prior chronological attempt with its current strategic objective. Focused on the lack of response for its final attempt, the model frequently generates assertions that the command failed entirely, leading to hallucinated diagnostics or further retries despite the successful execution of the underlying system action.

## **WebSocket RPC Format and Resolution Constraints**

To resolve the pending execution state, the ZuberiChat frontend must construct and transmit an exec.approval.resolve RPC packet back through the WebSocket connection. This transmission is strictly guarded by the OpenClaw security boundary; the connecting client must possess the operator.approvals authorization scope, verified via device identity pairing during the initial handshake.4

The resolution payload requires absolute structural precision. The frontend must transmit the exact id string captured from the initial broadcast, paired with a decision parameter that is restricted to three specific enumeration values.5

The outgoing JSON-RPC structure must strictly adhere to the following schema:

| RPC Payload Field | Required Value / Data Type | Operational Function |
| :---- | :---- | :---- |
| method | "exec.approval.resolve" | The internal gateway routing target for the RPC. |
| id | String | A client-generated message ID for tracking the RPC response. |
| params.id | String | The exact UUID of the pending execution request from the gateway. |
| params.decision | String | Must be exactly "allow-once", "allow-always", or "deny". |

If the operator decision is transmitted as "allow-always", the gateway dynamically updates the local exec-approvals.json file to auto-authorize future occurrences of that specific binary footprint, bypassing the broadcast requirement for subsequent invocations.1

If the correlation is incorrect—for example, if the frontend transmits an exec.approval.resolve packet utilizing an ID that has already been resolved, timed out, or was malformed during a React state update—the gateway generates an unknown requestId or unknown approval ID error.8 The gateway immediately discards the resolution packet, returning an error payload to the client, while the targeted command remains stalled in a pending state until its expiration timer elapses.

## **Agent Loop Dynamics During the Approval Wait State**

The behavior of the OpenClaw agent loop during the approval process is the primary catalyst for the cascading failures observed. To prevent a single delayed human prompt from deadlocking the entire orchestration engine, the gateway deliberately avoids blocking the agent loop.2

Upon encountering a policy miss, the exec tool returns the status: "approval-pending" payload to the model and immediately yields generation control back to the inference engine.2 This non-blocking architecture relies entirely on the language model's cognitive capacity to interpret the concept of a "pending" state accurately, halt its generative directives, and patiently await the subsequent asynchronous injection of the Exec finished system event.

While waiting, the model is fully capable of generating additional messages, executing parallel tools, or querying other APIs. The generation of new text, including the issuance of retries for the pending command, does not cancel or invalidate the pending approval residing in the gateway's memory. The OpenClaw architecture tracks these as separate branches of execution.2 Consequently, the system depends on prompt engineering and model obedience to enforce synchronous waiting within an inherently asynchronous execution pipeline.

## **Inference Engine Topologies and the Harmony Format**

The tendency of the agent to rapidly retry commands rather than waiting is inextricably linked to the specific inference engine configuration utilized by Zuberi. The system relies on Ollama serving gpt-oss:20b, an open-weight model trained via a Mixture-of-Experts architecture specifically on the Harmony response format.10

## **Multi-Channel Architecture**

The Harmony format enforces a rigid structural paradigm on generative outputs, compartmentalizing the response into specialized operational channels. The model weights are strictly aligned to generate tokens conforming to this multi-channel protocol, mapping closely to the OpenAI Chat Completions API and Function Calling interfaces.11

The output structure utilizes specific sentinel tokens to divide cognitive processes:

| Harmony Channel | Sentinel Token | Purpose and Content |
| :---- | :---- | :---- |
| **Analysis** | \<|channel|\>analysis\<|message|\> | Internal chain-of-thought (CoT). A raw workspace for evaluation, planning, and outcome debate. Not intended for end-user visibility. |
| **Commentary** | \<|channel|\>commentary\<|message|\> | Handles function and tool invocations. The structured JSON payload targeting the OpenClaw gateway is emitted here. |
| **Final** | \<|channel|\>final\<|message|\> | Delivers the sanitized, formatted natural language output intended for rendering in the chat interface. |

## **The Pathology of Heuristic Monologues**

When the OpenClaw exec tool returns the status: "approval-pending" payload, this text is appended to the model's active context window. The model immediately initiates a new generation cycle to process this information, opening the \<|channel|\>analysis\<|message|\> block to evaluate the situation.13

Because gpt-oss:20b is an open-weight model prioritized for continuous task completion, its internal evaluation mechanisms frequently interpret a "pending" state as a stalled, unacknowledged, or failed process.14 Within the analysis channel, the model generates text reflecting its deduction that the command has not executed. It concludes that an error must have occurred in the transmission pipeline and determines that the logical remedy is to invoke the tool again.15

This phenomenon is formally documented as an analytical blackhole or "quant fever" within the gpt-oss model family.14 The model becomes hyper-fixated on forcing the tool execution to complete to fulfill its programmed objective. The very act of generating the analytical text explaining *why* it should retry algorithmically guarantees that it *will* execute the retry. The visible analytical loop directly compounds the problem, creating a positive feedback loop of tool invocations that results in the rapid stacking of approval cards until context limits are reached.

## **Token Parsing and Payload Extraction**

The OpenClaw gateway does not intercept these tool calls at the raw token level. It relies on the inference provider (Ollama) and upstream parsers to evaluate the Harmony channels and extract the structured JSON strictly from the commentary channel.16

If the model, trapped in a repetitive analytical loop, begins to hallucinate or degrade the Harmony syntax—such as misplacing the \<|constrain|\>json token or omitting the terminal \<|call|\> marker—the extracted JSON payload becomes fundamentally malformed.16 The gateway may successfully register an execution attempt and trigger the pending state broadcast, but upon receiving the user's approval, the underlying operating system run fails silently due to corrupted argument structures. This heavily contributes to the documented symptom where an action is explicitly confirmed by the user, yet the tool execution fails to complete in the background.

## **Frontend State Management and Race Conditions**

The ZuberiChat frontend utilizes React and a Tauri v2 architecture to bridge the user interface with the local gateway. The historical patches applied to this interface demonstrate systemic flaws in managing asynchronous state across an active WebSocket connection.

## **Reference Mismanagement**

The implementation of the pendingQueueRef in version v1.0.11 attempted to resolve dropped WebSocket messages by queueing outgoing exec.approval.resolve RPCs when the WebSocket.readyState was not OPEN. While addressing temporary network jitter, this mechanism remains highly susceptible to race conditions within a concurrent streaming pipeline.

React ref variables (useRef) do not trigger component re-renders when updated, nor do they guarantee closure stability during rapid component lifecycles. If the inline ToolApprovalCard component unmounts and remounts rapidly—a scenario virtually guaranteed when the language model is spamming retries and forcing rapid chat layout shifts—the specific closure capturing the UUID for the resolution RPC may become stale \[User Query Context\].

Furthermore, the frontend must maintain absolute parity between the streaming message identifiers and the embedded approval instances. Prior patches addressed streamingMessageIdRef handling for text chunk rendering. However, approval events are broadcast asynchronously on the main gateway WebSocket channel, which is inherently detached from the targeted tool-event streams delivering textual chunks.17 If the frontend logic erroneously conflates the ID of a streaming text chunk with the UUID of the approval request, it will attempt to transmit an exec.approval.resolve packet utilizing an invalid correlation ID. The gateway receives this packet, detects the unknown ID, and discards the resolution, leaving the legitimate command stalled in a pending state.5

## **Timer Desynchronization**

The ZuberiChat interface implements a localized 15-second safety-net timer that resets the approval card to 'pending' if it remains stuck on 'resolving'. This introduces a severe temporal desynchronization with the gateway's native 120-second expiration timer.

When a user clicks "Allow," the frontend visually transitions to 'resolving'. If the local 15-second timer fires before the gateway can acknowledge the execution via an Exec finished event—which routinely occurs if the execution involves a prolonged system task like npm install—the frontend reverts the UI to 'pending'. The user, assuming the initial interaction failed, clicks "Allow" a second time. This transmits a redundant exec.approval.resolve RPC. The gateway, having already processed the initial resolution and cleared the pending state from its memory, rejects the duplicate request, resulting in an unknown requestId error and further state confusion on the frontend.9

## **Configuration Hot-Reloading and Synchronization Gaps**

The mechanism by which the OpenClaw gateway manages policy caching contributes directly to intermittent failures, specifically undermining the RTL-061 patch. The RTL-061 initiative attempted to bypass the frontend entirely for read-only commands by having the ZuberiChat backend automatically write "allow-always" entries directly into the host's exec-approvals.json file.

The gateway is architected to hot-reload the exec-approvals.json configuration upon file system modification.18 However, this reload is not instantaneous, nor is it retroactive to events already isolated in runtime memory.

When the model invokes a command, the gateway evaluates the policy *before* emitting the broadcast. If the policy results in a miss, the approval id is generated, and the execution is suspended in memory. If ZuberiChat intercepts this specific command and simultaneously writes a bypass to exec-approvals.json, the gateway hot-reloads the updated configuration for future requests. Crucially, the pending execution instance already residing in memory does not re-evaluate against the newly loaded configuration.6

The command remains bound to the state of the policy at the exact millisecond of invocation. It will indefinitely await an explicit exec.approval.resolve RPC over the WebSocket. Because ZuberiChat assumed the configuration file write was sufficient to clear the block, it skips transmitting the necessary WebSocket resolution RPC. The command silently times out after 120 seconds, resulting in execution failure despite the configuration file containing the correct permissions.

## **Version-Specific Anomalies in v2026.3.8**

Extensive analysis of the OpenClaw v2026.3.8 release reveals documented anomalies within the execution approval subsystem that exacerbate these failures. Known issues indicate instances where the execution approval socket (exec-approvals.sock) fails to initialize promptly upon a gateway restart.19

During this initialization failure window, the gateway defaults to a strict prompt requirement for all commands, completely ignoring the underlying exec-approvals.json configuration.19 In these failure states, commands are blocked for variable windows spanning between 3 and 18 minutes before a fallback path eventually clears the queue.20 If the agent is operating during this initialization vulnerability window, the exec-approvals.json bypasses written by the RTL-061 patch will be entirely ignored by the gateway, forcing the pipeline to trigger and generating the stacked approval cards on the frontend regardless of the requested auto-approval policy.

## **Known OpenClaw Vulnerabilities and Execution Bugs**

A review of the OpenClaw GitHub repository and CVE databases highlights several specific bugs related to execution approvals that align with the symptoms experienced by the Zuberi system.

| Issue / CVE | Description | Impact on Stack |
| :---- | :---- | :---- |
| **Issue \#22144** | Exec approval delay of 3-18 minutes after gateway restart despite security=full, ask=off. | Forces intermittent approval requirements regardless of configuration, undermining RTL-061 auto-approval strategies.20 |
| **Issue \#26962** | exec-approvals.json with security: "full" does not bypass the exec approval gate, resulting in approval-timeout. | Demonstrates gateway memory state disconnects; file configurations fail to resolve pending internal queues.6 |
| **Issue \#16348** | Per-agent exec-approvals config ignored for cron-triggered sessions, resulting in approval-pending loops. | Confirms the gateway's tendency to drop to default ask: on-miss policies during background executions, stalling the agent.15 |
| **CVE-2026-28473** | Authorization bypass where clients with operator.write scope can approve requests via /approve chat command. | Highlights the split architecture between direct RPC calls and internal chat-command routing for resolutions.21 |

These documented anomalies confirm that the failure path involves gateway-side processing logic that periodically detaches from the declared file state, rendering frontend-only fixes like RTL-061 insufficient.

## **Comparative Ecosystem Implementations**

To validate the specificity of these failures to the local stack, it is critical to examine how alternative interfaces connected to the OpenClaw gateway manage execution approvals.

Integrations with chat channels such as Discord, Slack, and Matrix operate under an entirely different interaction paradigm. In a chat channel, the OpenClaw gateway forwards the approval prompt as a standard text message. The human operator is required to manually type a command, such as /approve \<id\> allow-once, to satisfy the requirement.3

This manual intervention provides an essential, implicit debounce mechanism. Because standard chat environments do not stream internal analytical tokens (the CoT) to the user, the operator is only presented with the final request. Furthermore, the manual typing process enforces synchronous operation from the user's perspective. The gateway processes the exact \<id\> supplied manually by the operator, ensuring absolute correlation without the risk of React ref closures becoming stale or desynchronizing during rapid layout shifts.

The native OpenClaw Dashboard (accessible via port 18789\) utilizes a more direct internal API to resolve pending work queues.22 It avoids the complex state management required to overlay inline operational cards directly on top of a highly volatile, live-streaming, multi-channel generative text container. The failures observed in ZuberiChat are therefore a direct consequence of attempting to fuse asynchronous, non-blocking gateway mechanics with synchronous, reactive user interface patterns, exacerbated by a highly hyperactive, reasoning-heavy open-weight model.

## **Comprehensive Architectural Recommendations**

Given the strict constraints of the environment—specifically, the prohibition against branching or forking the core OpenClaw v2026.3.8 repository and the mandate to maintain the existing Ollama and gpt-oss:20b stack—the remediation strategy must employ a highly coordinated, multi-tiered approach. The solution requires precise interventions at the inference parameter level, the frontend state machine, and the communication payload.

## **Tier 1: Inference Constraint and Analytical Suppression**

The most critical intervention is severing the positive feedback loop generated by the Harmony analysis channel. If the model cannot verbally iterate on its failure within the context window, the rapid retry loop that creates the stacked cards will cease.

The Ollama Modelfile serving gpt-oss:20b must be heavily customized to enforce deterministic behavior and suppress expansive heuristic generation.24

1. **Analytical Effort Reduction:** The gpt-oss model supports an internal variable governing heuristic depth.25 The Modelfile system prompt must explicitly cap this by initiating the template with Reasoning: low.26 This minimizes the token buffer allocated to the analysis channel, severely limiting the model's ability to debate the pending state and force a retry.  
2. **Anti-Loop Directives:** The Modelfile must utilize an aggressive, rule-based system prompt designed specifically for non-blocking agent execution. The exact phrasing must dictate behavior upon encountering a pending state 24:  
   * *“You are a singular-execution deterministic agent. If a tool invocation returns an approval-pending state, you must immediately halt generation and await external system events. Do not evaluate the pending status. Do not re-issue the same command parameters under any circumstances. If the last output matches a pending state, terminate generation explicitly.”*  
3. **Temperature and Sampling Constraints:** The Modelfile must strictly enforce PARAMETER temperature 0.1 and elevate the PARAMETER repeat\_penalty (e.g., to 1.2) to prevent the model from drifting into hallucinated repetitions of the tool call syntax when context becomes stagnant.24

## **Tier 2: Frontend Pipeline Deduplication and State Isolation**

The ZuberiChat frontend must shoulder the responsibility of managing the gateway's asynchronous behavior. The frontend must act as a strict state machine that protects the user interface from duplicate gateway broadcasts.

1. **Global Deduplication Ledger:** The React application must maintain a global, module-level Map (instantiated outside of the React render cycle to prevent closure staleness) that tracks active execution commands. When an exec.approval.requested event arrives over the WebSocket, the middleware must evaluate the command and commandArgv payload against the active ledger.  
2. **Event Swallowing:** If a broadcast arrives for a command signature that is already flagged as pending in the ledger, the frontend must completely swallow the event. It must not update React state, and it must not render a new ToolApprovalCard. The UI must display precisely one approval card per unique command signature, regardless of how many discrete UUIDs the gateway has generated in the background.  
3. **Proxy Resolution Routing:** When the user interacts with the singular visual card and clicks "Allow", the frontend must locate the *most recent* UUID associated with that command signature in its internal ledger and dispatch the exec.approval.resolve packet targeting that specific, latest ID.  
4. **Implicit Memory Cleanup:** Upon dispatching the resolution, the frontend must immediately iterate through all older, discarded UUIDs for that same command signature and dispatch exec.approval.resolve packets with the decision: "deny" payload. This affirmatively clears the gateway's memory, preventing background timeouts from causing latent system instability or unexpected executions minutes later.

## **Tier 3: Deterministic RPC Reconstruction**

To resolve the instances where the gateway drops the resolution payload entirely, the precise formatting of the JSON-RPC transmission over the WebSocket must be mathematically guaranteed, avoiding React state closures entirely.

1. **Direct Parameter Mapping:** The exec.approval.resolve packet must not rely on component-level useRef hooks to locate the approval ID. The UUID must be passed as a direct string argument into the execution handler at the exact moment of the click event.  
2. **Strict Payload Formatting:** The outgoing packet must perfectly mirror the OpenClaw schema requirements.5 The structure must be serialized exactly, ensuring the decision parameter contains no trailing spaces or casing discrepancies.  
3. **Queue Re-validation:** The pendingQueueRef introduced in the v1.0.11 patch must evaluate WebSocket.readyState \=== WebSocket.OPEN strictly before the JSON.stringify phase. If the socket is reconnecting, the UUID payloads must be buffered in a persistent local storage queue, rather than a transient memory ref, to survive unhandled component remounts during network reconnection jitter.  
4. **Timer Elimination:** The localized 15-second safety-net timer on the ToolApprovalCard must be removed entirely. The frontend must respect the gateway's native execution timeframe. If visual feedback is required, the UI should indicate a 'resolving' state indefinitely until an Exec finished or Exec denied system event is explicitly received from the gateway via the WebSocket stream.

## **Tier 4: Synchronous Context Injection**

The final architectural requirement addresses the language model's contextual awareness and breaks the cognitive loop. When the frontend successfully intercepts an exec.approval.requested broadcast, it must immediately inject an artificial system message directly into the agent's visible context stream.

This injected message should mimic a definitive system response, formatted as: *“System: Execution suspended. Human operator is currently reviewing the action. Await manual intervention. Proceeding with other tasks is restricted.”*

By artificially injecting this sequence into the context window, the gpt-oss:20b model's Harmony evaluation channel is provided with a definitive, authoritative state change. The model reads the injected system message, satisfies its internal heuristic requirement for an operational conclusion, and successfully pauses its generative loop. This cleanly eliminates the primary catalyst for the stacked approval failures, ensuring the architecture remains stable, responsive, and secure.

#### **Works cited**

1. Exec Approvals \- OpenClaw Docs, accessed March 12, 2026, [https://docs.openclaw.ai/tools/exec-approvals](https://docs.openclaw.ai/tools/exec-approvals)  
2. Exec Tool \- OpenClaw, accessed March 12, 2026, [https://docs.openclaw.ai/tools/exec](https://docs.openclaw.ai/tools/exec)  
3. openclaw/docs/tools/exec-approvals.md at main \- GitHub, accessed March 12, 2026, [https://github.com/openclaw/openclaw/blob/main/docs/tools/exec-approvals.md](https://github.com/openclaw/openclaw/blob/main/docs/tools/exec-approvals.md)  
4. Gateway Protocol \- OpenClaw Docs, accessed March 12, 2026, [https://docs.openclaw.ai/gateway/protocol](https://docs.openclaw.ai/gateway/protocol)  
5. Approval timing \- Friends of the Crustacean \- Answer Overflow, accessed March 12, 2026, [https://www.answeroverflow.com/m/1478826355297615883](https://www.answeroverflow.com/m/1478826355297615883)  
6. exec-approvals.json security=full not respected — commands still gated \#26962 \- GitHub, accessed March 12, 2026, [https://github.com/openclaw/openclaw/issues/26962](https://github.com/openclaw/openclaw/issues/26962)  
7. Npm/Openclaw \- GitLab Advisory Database, accessed March 12, 2026, [https://advisories.gitlab.com/pkg/npm/openclaw/](https://advisories.gitlab.com/pkg/npm/openclaw/)  
8. No approvals coming to discord OR dashboard \- Friends of the Crustacean, accessed March 12, 2026, [https://www.answeroverflow.com/m/1472533274457935883](https://www.answeroverflow.com/m/1472533274457935883)  
9. Getting error after giving approval for exec: unknown requestId \- Friends of the Crustacean \- Answer Overflow, accessed March 12, 2026, [https://www.answeroverflow.com/m/1479258338607759502](https://www.answeroverflow.com/m/1479258338607759502)  
10. Introducing gpt-oss \- OpenAI, accessed March 12, 2026, [https://openai.com/index/introducing-gpt-oss/](https://openai.com/index/introducing-gpt-oss/)  
11. What is GPT OSS Harmony Response Format? | by Cobus Greyling \- Medium, accessed March 12, 2026, [https://cobusgreyling.medium.com/what-is-gpt-oss-harmony-response-format-a29f266d6672](https://cobusgreyling.medium.com/what-is-gpt-oss-harmony-response-format-a29f266d6672)  
12. openai/harmony: Renderer for the harmony response format to be used with gpt-oss \- GitHub, accessed March 12, 2026, [https://github.com/openai/harmony](https://github.com/openai/harmony)  
13. Build a Weather Assistant with OpenAI GPT-OSS and Harmony SDK on Vast.ai, accessed March 12, 2026, [https://vast.ai/article/build-a-weather-assistant-with-openai-gpt-oss-and-harmony-sdk-on-vast-ai](https://vast.ai/article/build-a-weather-assistant-with-openai-gpt-oss-and-harmony-sdk-on-vast-ai)  
14. Quant Fever, Reasoning Blackholes, Schrodinger's Compliance, and More: Probing GPT‑OSS‑20B \- arXiv.org, accessed March 12, 2026, [https://arxiv.org/html/2509.23882](https://arxiv.org/html/2509.23882)  
15. \[Bug\]: Per-agent exec-approvals config ignored for cron-triggered sessions \#16348 \- GitHub, accessed March 12, 2026, [https://github.com/openclaw/openclaw/issues/16348](https://github.com/openclaw/openclaw/issues/16348)  
16. openai/gpt-oss-20b · Function call token ordering mismatch with Harmony format and chat template \- Hugging Face, accessed March 12, 2026, [https://huggingface.co/openai/gpt-oss-20b/discussions/218](https://huggingface.co/openai/gpt-oss-20b/discussions/218)  
17. agent hooks and websocket events \- Friends of the Crustacean \- Answer Overflow, accessed March 12, 2026, [https://www.answeroverflow.com/m/1474467427776466954](https://www.answeroverflow.com/m/1474467427776466954)  
18. tool runs \- Friends of the Crustacean \- Answer Overflow, accessed March 12, 2026, [https://www.answeroverflow.com/m/1479207937061683282](https://www.answeroverflow.com/m/1479207937061683282)  
19. exec-approvals.sock never created after v2026.2.22 update (harden safe-bin trust) \#23949, accessed March 12, 2026, [https://github.com/openclaw/openclaw/issues/23949](https://github.com/openclaw/openclaw/issues/23949)  
20. \[Bug\]: Exec approval delay of 3-18 minutes after gateway restart despite security=full, ask=off \#22144 \- GitHub, accessed March 12, 2026, [https://github.com/openclaw/openclaw/issues/22144](https://github.com/openclaw/openclaw/issues/22144)  
21. CVE-2026-28473 \- Vulnerability Details \- OpenCVE, accessed March 12, 2026, [https://app.opencve.io/cve/CVE-2026-28473](https://app.opencve.io/cve/CVE-2026-28473)  
22. mudrii/openclaw-dashboard \- GitHub, accessed March 12, 2026, [https://github.com/mudrii/openclaw-dashboard](https://github.com/mudrii/openclaw-dashboard)  
23. One-click RCE on OpenClaw in under 2 hours with an Autonomous Hacking Agent | Ethiack, accessed March 12, 2026, [https://ethiack.com/news/blog/one-click-rce-openclaw](https://ethiack.com/news/blog/one-click-rce-openclaw)  
24. Just try gpt-oss:20b : r/ollama \- Reddit, accessed March 12, 2026, [https://www.reddit.com/r/ollama/comments/1r2ex9k/just\_try\_gptoss20b/](https://www.reddit.com/r/ollama/comments/1r2ex9k/just_try_gptoss20b/)  
25. openai/gpt-oss-20b \- Hugging Face, accessed March 12, 2026, [https://huggingface.co/openai/gpt-oss-20b](https://huggingface.co/openai/gpt-oss-20b)  
26. set nothink or \--think=false Not working for gpt-oss:20b · Issue \#11751 \- GitHub, accessed March 12, 2026, [https://github.com/ollama/ollama/issues/11751](https://github.com/ollama/ollama/issues/11751)  
27. you can disable thinking on gpt-oss models by adding this to prompt : r/LocalLLaMA \- Reddit, accessed March 12, 2026, [https://www.reddit.com/r/LocalLLaMA/comments/1miyysp/you\_can\_disable\_thinking\_on\_gptoss\_models\_by/](https://www.reddit.com/r/LocalLLaMA/comments/1miyysp/you_can_disable_thinking_on_gptoss_models_by/)