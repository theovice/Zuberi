# **Execution Approval Flow and Authorization Architecture in OpenClaw v2026.3.8**

The orchestration of large language models in localized, agentic frameworks presents a fundamental security challenge: bridging the non-deterministic intent of a generative model with the highly privileged, deterministic execution environment of a host operating system. OpenClaw implements a distributed, three-tier architecture to manage this risk, consisting of a central control plane (the Gateway), device-specific agent runtimes (Execution Nodes), and external interface adapters (Communication Channels).1 Within this topology, the exec tool serves as the primary conduit for system-level capabilities, allowing the agent to invoke shell commands, manage filesystems, and interface with external binaries.

To prevent unauthorized command execution, privilege escalation, and lateral movement, OpenClaw enforces a rigid, multi-stage approval flow. However, operators frequently encounter a paradox within highly secure configurations: systems meticulously configured to solicit human approval for every action will autonomously deny execution requests without ever presenting a prompt to the user interface. This report provides an exhaustive, end-to-end analysis of the OpenClaw v2026.3.8 execution pipeline, detailing the configuration matrices, the WebSocket protocol contracts, the mechanisms of persistent trust, and the specific failure modes that result in silent execution denials.

## **The End-to-End Execution Pipeline**

The execution flow in OpenClaw is not a monolithic function but a strictly ordered, distributed pipeline encompassing intent generation, policy evaluation, cryptographic capability verification, and synchronous inter-process communication.

The lifecycle of a command execution begins when an artificial intelligence agent synthesizes a tool invocation request. The model generates a generic payload containing the requested command, execution arguments, a designated working directory, and necessary environment variable overrides.2 This payload is initially intercepted by the OpenClaw Gateway, which must perform environment resolution to determine the target Execution Host. The physical or virtual boundary of the execution is governed by the tools.exec.host configuration directive. The system defaults to isolating operations within a containerized sandbox, but operators can elevate the execution boundary to the gateway (the host machine running the primary daemon) or a peripheral node (such as a remote headless server or a macOS companion application).2

Once the target environment is resolved, the Gateway initiates the policy evaluation phase. This phase assesses the absolute upper bound of permitted actions using the tools.exec.security policy.2 If the security policy resolves to deny, the execution is immediately blocked, and a rejection notice is returned to the agent's context window. If the policy permits the action conditionally (such as under an allowlist directive), the Gateway cross-references the requested command against a persistent local registry and a predefined list of inherently safe binaries.2

Assuming the command survives the theoretical security boundary evaluation, the Gateway shifts to the interaction evaluation phase, guided by the tools.exec.ask policy.2 This policy determines whether human-in-the-loop (HITL) authorization is computationally mandated. If the policy dictates that operator consent is required, the Gateway must transition from a synchronous processing state to an asynchronous holding pattern. It pauses the agent's execution thread, returning an immediate approval-pending state along with a unique correlation identifier to the language model, thereby preventing the model from entering a recursive timeout loop while waiting for human input.2

Simultaneously, the Gateway prepares to broadcast the approval request to the human operator. It packages the precise execution context into an exec.approval.requested payload and transmits it over the WebSocket multiplexer to all connected client interfaces that possess the verified cryptographic capability to authorize commands.5

The final phase of the pipeline relies entirely on the operator's response. The client application must transmit an exec.approval.resolve WebSocket message back to the Gateway, referencing the exact correlation identifier and articulating a decision, which typically ranges from a singular allowance to a permanent denylist directive.4 If the operator grants approval, the Gateway constructs a systemRunPlan. This plan represents a canonical, immutable snapshot of the exact command, absolute paths, and environment context.4 Recent security enhancements in the v2026.3.x lineage introduced strict binding to this systemRunPlan to ensure that mutable script operands—such as dynamically loaded Ruby files or shell scripts—cannot drift or be maliciously rewritten between the moment of human approval and the exact millisecond of host execution, thereby neutralizing sophisticated Time-of-Check to Time-of-Use (TOCTOU) exploitation vectors.7

## **Configuration Schema and Priority Matrices**

The authorization architecture relies on a deterministic matrix of overlapping configuration fields. A profound understanding of the exact relationship between the ask, host, and security directives is mandatory for diagnosing systemic authorization failures.

## **The tools.exec Structural Schema**

The global parameters governing the agent's execution capabilities are defined within the tools.exec JSON object, predominantly located within the primary openclaw.json configuration file. The schema enforces strict type validation and supports a wide array of behavioral modifiers.

| Configuration Field | Data Type | Default Value | Functional Description |
| :---- | :---- | :---- | :---- |
| host | String | sandbox | Defines the execution perimeter. Valid values are sandbox, gateway, or node.2 If sandboxing is globally disabled but explicitly requested, the system securely fails closed.2 |
| security | String | deny / allowlist | Defines the enforcement modality. Defaults to deny for sandboxes and allowlist for gateways and nodes.2 Options include deny, allowlist, and full.2 |
| ask | String | on-miss | Controls the frequency of human-in-the-loop prompts. Valid options are off, on-miss, and always.2 |
| notifyOnExit | Boolean | true | Dictates whether backgrounded execution sessions enqueue a system event and request an active heartbeat upon process termination.2 |
| approvalRunningNoticeMs | Integer | 10000 | The latency threshold (in milliseconds) before the system emits a "running" notification for approval-gated commands that block the event loop.2 |
| pathPrepend | Array | \`\` | A list of explicit directory paths prepended to the PATH environment variable for sandbox and gateway execution runs.2 |
| safeBins | Array | Predefined | A tightly controlled array of stdin-only binary filters (e.g., jq, wc) permitted to run without explicit operator allowlisting.2 |
| safeBinTrustedDirs | Array | \["/bin", "/usr/bin"\] | Absolute directory paths trusted for safeBins resolution. Environmental PATH variables are never implicitly trusted.2 |
| safeBinProfiles | Object | Empty | Defines rigorous argument constraints (argv policies) for safe binaries, enforcing limits on positional arguments and denoting explicitly denied flags.2 |

The resolution of these configuration settings operates on a strict hierarchical priority sequence. The absolute baseline policy is established in the global configuration file. However, operators can apply ephemeral per-session overrides utilizing the /exec chat command (e.g., /exec ask=always security=allowlist), which updates the runtime session state without modifying the underlying persistent disk file.2 Furthermore, specific tool calls synthesized by the language model can carry embedded execution parameters, though the Gateway parser restricts the model from arbitrarily elevating its own security boundaries.2

## **Interaction Dynamics: Security vs. Ask Policies**

A widespread operational fallacy assumes that configuring the system to prompt for permission guarantees an interactive execution flow. This misunderstanding stems from confusing the security field, which dictates what is computationally permissible, with the ask field, which dictates the user experience.

When tools.exec.security is set to allowlist, the execution engine adopts a default-deny posture. Any command that fails to match a persistent, resolved binary path pattern (for example, /usr/bin/git) is flagged by the security module.2 If the corresponding tools.exec.ask policy is set to on-miss, this flag triggers an approval broadcast to the operator. If the operator approves the command using an allow-always directive, the path is appended to the persistent allowlist, and all subsequent invocations of that exact binary execute silently without further human interaction.4

However, if tools.exec.ask is explicitly set to always, the Gateway is instructed to generate a WebSocket approval broadcast for every single execution attempt, regardless of whether the target binary already exists on the allowlist.4 In this configuration, the allowlist merely permits the *request* to be validated; it cannot bypass the absolute ask: "always" interaction directive.

Conversely, if tools.exec.security remains allowlist but tools.exec.ask is set to off, the system is instructed to never solicit human input. Under these specific constraints, commands that are already present on the allowlist execute immediately. Commands that are absent from the allowlist are denied instantly and silently, as the system possesses no mechanism to prompt the user for an exception.2 The only method to completely circumvent all guardrails and execute any arbitrary command silently is to set tools.exec.security to full while simultaneously setting tools.exec.ask to off—a configuration considered highly dangerous outside of strictly isolated sandbox environments.2

| Theoretical Security Policy | Interactive Ask Policy | Command Present in Allowlist | Execution Outcome Sequence |
| :---- | :---- | :---- | :---- |
| allowlist | on-miss | Yes | Executes immediately without human prompt. |
| allowlist | on-miss | No | Halts execution; prompts operator via WebSocket broadcast. |
| allowlist | always | Yes | Halts execution; prompts operator via WebSocket broadcast. |
| allowlist | always | No | Halts execution; prompts operator via WebSocket broadcast. |
| allowlist | off | Yes | Executes immediately without human prompt. |
| allowlist | off | No | Fails instantly; silent denial returned to agent. |
| full | off | N/A | Executes any command immediately, bypassing all checks. |

## **Vulnerability-Driven Architectural Constraints**

The rigid nature of these configuration interactions is not arbitrary; it is the direct architectural response to a series of historical vulnerabilities affecting localized agent orchestration frameworks. The execution host evaluates allowlist matches against resolved absolute paths rather than relative basenames to prevent PATH-hijacking and masquerading attacks.2 Furthermore, command chaining operators (such as &&, ||, and ;) are inherently rejected under the allowlist security mode unless every individual segment of the pipeline satisfies the allowlist criteria or is explicitly defined as a safe binary.2

This strict pipeline validation was implemented to mitigate critical vulnerabilities such as GHSA-9868-vxmx-w862, where security researchers demonstrated that attackers could bypass allowlist enforcement by exploiting shell line-continuation sequences.8 By embedding a backslash followed by a newline character ($\\ \+ newline) inside command substitution syntax, attackers forced the internal OpenClaw parser to identify the payload as a harmless, allowlisted binary. However, upon execution, the underlying shell runtime collapsed the continuation sequence, thereby executing entirely different, unapproved, and highly destructive injected subcommands.8

Similarly, the highly granular safeBinProfiles configuration was hardened following the disclosure of GHSA-3c6h-g97w-fg78. This vulnerability revealed that threat actors could utilize abbreviated GNU long-options (for example, using \--compress-prog instead of the full flag for the sort utility) to bypass flag-denial checks within the safe bin evaluation logic. This allowed arbitrary, approval-free execution paths disguised as standard text-filtering utilities.10 Consequently, the execution host now performs exhaustive, multi-pass analysis on the requested command structures before an event is ever deemed safe enough to queue for human approval.

## **Persistent State Management: The Unix Socket and exec-approvals.json**

The authorization state of the OpenClaw architecture is not stored ethereally in volatile memory; it is rigorously persisted to disk on the designated Execution Host via the \~/.openclaw/exec-approvals.json mechanism.4 This file functions as a dynamic local database, governing host-specific trust boundaries and ensuring that approval contexts survive daemon restarts.

## **Schema of the Trust Database**

The file structure is organized hierarchically by trust scopes, ensuring that approvals granted to one specific agent profile do not inadvertently leak execution permissions to unrelated models or agent instances.4

* **defaults**: Represents the fallback policy applied universally when no agent-specific override exists. It contains the baseline security, ask, and critical askFallback directives.13  
* **agents**: A nested object dictionary where keys correspond to specific agent identifiers (e.g., agents.main). Each entry maintains a deeply isolated allowlist specific to that agent's operational mandate.4  
* **allowlist arrays**: These structures are not mere arrays of strings. Each entry is a complex object tracking rich metadata, including a stable UUID for user interface correlation, a glob pattern representation of the binary (e.g., /usr/bin/git), the exact timestamp of its last invocation, the specific command string most recently executed, and the fully resolved absolute binary path.4 This schema guarantees that approvals remain highly auditable.  
* **socket**: A foundational structural component defining the Unix domain socket path utilized for high-speed local inter-process communication (IPC) regarding real-time approval state changes.17

## **Initialization Sequences and Latency Anomalies**

During the Gateway's boot sequence, the OpenClaw daemon initializes the execution approval subsystem. This sequence involves parsing the exec-approvals.json file, migrating any legacy schema components, and establishing the designated Unix socket for IPC.

A well-documented failure mode, frequently manifesting as a severe 3-to-18 minute initialization delay or a total systemic hang, arises from the intersection of filesystem permission boundaries and containerization. If the exec-approvals.json file dictates a socket.path pointing to an absolute host directory that the OpenClaw container runtime lacks the explicit permission to write to (for example, a path like "/home/markus/....sock" mapped incorrectly inside a rigid Docker container), the underlying Node.js process encounters a fatal EACCES: permission denied, mkdir exception.17

Instead of terminating the primary process and crashing the container, the Gateway is engineered to attempt exponential backoff retries, heavily delaying the availability of the entire execution subsystem.18 If the Unix socket cannot be successfully instantiated after the retry threshold is exhausted, the Gateway may initialize in a persistently degraded state. In this state, it cannot successfully route execution approvals to the persistent store, leading to latent, silent failures during tool invocation. To remediate this specific architectural hang, operators must ensure that the socket path defined within the JSON configuration points to a strictly container-safe directory, utilizing portable paths such as \~/.openclaw/exec-approvals.sock or an explicitly mounted /home/node/.openclaw/ volume path.17

## **The WebSocket Protocol and the Event Contract**

The central nervous system of the OpenClaw framework is its WebSocket gateway protocol. This multiplexed protocol manages all system telemetry, multi-agent orchestration, and human-in-the-loop approval routing.5 A comprehensive understanding of the event lifecycle and the strict cryptographic scope requirements is imperative for debugging scenarios where expected approval flows fail to materialize on the client interface.

## **Handshake and Scope Negotiation**

When a client application—such as the native Control UI, the macOS companion app, or a third-party interface like ZuberiChat—connects to the OpenClaw Gateway port (typically bound to 18789), it does not immediately receive privileged telemetry or operational capabilities.1 The connection lifecycle initiates with a strict connect.challenge frame emitted by the Gateway. The client must respond to this challenge with a mathematically signed cryptographic payload or a valid authentication token previously issued by the system.5

Embedded within this initial handshake response payload, the client must explicitly declare its intended operational role (for example, operator) and request an array of scopes.5 Scopes represent distinct vertical access tiers within the OpenClaw Role-Based Access Control (RBAC) architecture. Standard conversational read and write capabilities require the operator.read and operator.write scopes.5 However, viewing and resolving system-level execution requests is categorized as a highly restricted operation. A client must explicitly request, and be cryptographically granted, the operator.approvals scope during the initial handshake to participate in any facet of the execution flow.5

Furthermore, clients wishing to monitor the live streaming output of currently executing tools must independently negotiate the tool-events capability (caps: \["tool-events"\]) during the connection sequence. Without this specific capability negotiation, the Gateway firewall prevents tool output leakage across potentially untrusted or unmonitored sessions.6

## **The exec.approval.requested Contract Schema**

If the Gateway logic concludes that an execution request requires human intervention, it constructs an event payload and prepares to broadcast it over the WebSocket multiplexer. Crucially, the Gateway enforces a hard, secondary filter at the broadcast emission layer: the event is *only* transmitted to connection instances that have successfully authenticated and actively possess the verified operator.approvals scope in the server's internal connection state memory.6

The schema of the broadcasted event is highly structured and immutable 6:

| JSON Field | Data Type | Description and Context |
| :---- | :---- | :---- |
| type | String | Fixed as "event", differentiating it from RPC requests or responses. |
| event | String | Fixed as "exec.approval.requested". |
| payload.id | String | The unique cryptographic correlation identifier. The client must retain this to resolve the request later. |
| payload.request.command | String | The base binary or shell command the agent intends to execute. |
| payload.request.commandArgv | Array | The parsed array of arguments accompanying the command. May be omitted depending on execution context. |
| payload.request.cwd | String | The absolute path of the requested working directory. |
| payload.request.host | String | The targeted execution boundary (e.g., "gateway" or "node"). |
| payload.request.agentId | String | The identifier of the specific agent invoking the tool. |
| payload.createdAtMs | Integer | Epoch timestamp of request generation. |
| payload.expiresAtMs | Integer | Epoch timestamp denoting the strict temporal window before the Gateway sweeps the request and autonomously issues a denial timeout (typically 120 seconds). |

Once the human operator interacts with the client UI to render a decision, the client must format and issue a corresponding exec.approval.resolve request back to the Gateway. This request must reference the exact payload.id and dictate the specific outcome (allow-once, allow-always, or deny) before the expiresAtMs threshold is crossed.6

## **Unpacking the "Silent Denial" Phenomenon**

A profound operational paradox exists in modern OpenClaw deployments: configuring a system for maximum interactive safety (by setting tools.exec.ask: "always") frequently results in the system entirely refusing to execute commands, completely circumventing the anticipated approval dialogs. This specific failure mode—where the Gateway outright denies commands without emitting the exec.approval.requested event—is not a software defect. It is a meticulously engineered security fallback mechanism that has become increasingly stringent in the v2026.x release lineage.

## **The Mechanics of the askFallback Short-Circuit**

When the OpenClaw Gateway concludes that an execution requires human authorization, it pauses the execution pipeline and prepares to broadcast the approval event. However, microseconds prior to emission, the Gateway performs a critical census of all active WebSocket connections. It scans specifically for connected clients currently holding the verified operator.approvals scope.6

If the Gateway detects that **zero approval-capable clients are currently connected**, it immediately aborts the broadcast phase and invokes the askFallback routing mechanism.18 The askFallback configuration—nested within the defaults block of the exec-approvals.json file—dictates the Gateway's autonomous behavior when an operator is physically unreachable or logically disconnected.15

By default, the system hardcodes askFallback to deny.15 This is a fundamental fail-safe design architecture. Without this default, a malicious or hallucinating agent operating in an unmonitored environment could queue hundreds of destructive commands, which would execute unpredictably and simultaneously hours later when an operator finally authenticates and processes the backlog.

In version v2026.2.22, the OpenClaw engineering team merged a pivotal architectural change to explicitly *"expire approval requests immediately when no approval-capable gateway clients are connected and no forwarding targets are available, avoiding delayed approvals after restarts/offline approver windows"*.18

Consequently, if the gateway detects zero clients with the required scope, the execution flow intentionally short-circuits. The Gateway does not emit the event, it does not wait for the standard 120-second timeout, and it returns an immediate approval-timeout or silent unauthorized denial directly to the agent runtime.14 To the end-user, the gateway appears to be capriciously denying commands without entering the approval flow, despite ask: "always" being explicitly configured.

## **Scope Degradation and Token Caching Errors**

The most insidious trigger for this autonomous short-circuit is unintended scope degradation. A client application (like the OpenClaw Dashboard or ZuberiChat) may visually indicate to the user that it is connected securely, but the Gateway server may have silently demoted its privileges during the handshake.

In OpenClaw v2026.2.x and v2026.3.8, a documented edge-case involves token rotation, daemon restarts, and Windows Subsystem for Linux (WSL2) network bridge restarts.24 Following a daemon restart or an automatic device token rotation, the local \~/.openclaw/devices/paired.json identity cache file may fail to accurately serialize the complete scope array for returning, known devices.25 A device that originally paired and possessed the operator.admin, operator.approvals, and operator.pairing scopes may be re-authenticated by the system with its access truncated to merely the operator.read scope.14

Because the Gateway strictly enforces Role-Based Access Control at the WebSocket connection layer, a client silently missing the operator.approvals scope in the server's cache is entirely invisible to the pre-broadcast approval census. The Gateway assumes the client is fundamentally incapable of authorizing execution, immediately triggers the askFallback: deny mechanism, and terminates the execution request.

## **Threat Model Context: CSWSH and Localhost Restrictions**

The strict, unforgiving enforcement of WebSocket scopes is a direct mitigation against Cross-Site WebSocket Hijacking (CSWSH) attack vectors. Historically, security analysts discovered that because modern web browsers do not enforce standard Same-Origin Policies (SOP) on WebSocket protocol upgrades targeting localhost, a malicious external website could silently open a connection to an unauthenticated OpenClaw Gateway running locally on a developer's workstation.26

This vulnerability, tracked as CVE-2026-25253 and dubbed "ClawJacked," allowed malicious JavaScript to impersonate the local user, brute-force the local authentication token via an unrestricted handshake rate limit, auto-approve its own rogue device pairing, and execute arbitrary operating system commands by bypassing the human user interface entirely.26 By enforcing cryptographic tokens and unyielding scope validation before emitting any exec.approval.requested events, OpenClaw isolates the highly privileged execution layer from unverified localhost traffic. If a client connection fails to properly assert its operator.approvals scope via a securely signed, server-verified token, it is ruthlessly excluded from the approval flow to prevent zero-click remote code execution.5

## **Plugin Ecosystem Interference: The lossless-claw Factor**

OpenClaw features a dynamic plugin architecture capable of registering custom tools, background services, and lifecycle hooks that fundamentally alter the agent's core interaction model.30 Deployments utilizing advanced context management often incorporate the lossless-claw plugin, a third-party extension implemented within the contextEngine architectural slot.31

Introduced fully in OpenClaw v2026.3.7, the ContextEngine interface permits plugins to intercept and manage the LLM context window by replacing the built-in sliding-window compaction logic with alternative, highly complex strategies, such as Directed Acyclic Graph (DAG) semantic summarization.31

The introduction of such plugins raises a critical diagnostic question: Does lossless-claw interfere with the system execution tool pipeline? Analysis of the Gateway plugin architecture reveals that ContextEngine lifecycle hooks (e.g., bootstrap, ingest, assemble, compact) operate strictly on the message transcript and token manipulation layers.32 They do not natively hook into the server-methods/exec-approval.ts pipeline or directly intercept operating system execution requests.6

However, lossless-claw heavily utilizes asynchronous background summarization processing, persisting vast message histories in a SQLite database and condensing them into higher-level semantic nodes.31 When the plugin processes historical context, it may dynamically spawn isolated subagents or utilize nested cron lanes to condense the data without blocking the primary user interface.33 If an execution request inadvertently originates from one of these isolated, backgrounded subagents (rather than the primary interactive chat thread driven by the user), it inherits a non-interactive session context.

In the OpenClaw security architecture, non-interactive environments—such as background cron jobs or headless autonomous processing handlers—are structurally incapable of bridging interactive prompts to a human user interface.34 Consequently, tool calls generated by background operations routinely yield an AcpRuntimeError: Permission prompt unavailable in non-interactive mode, or fall immediately to the askFallback sequence without ever attempting to generate a WebSocket broadcast.34 While lossless-claw does not inherently break the exec tool, its aggressive background threading can mask interactive execution intents if the language model inadvertently attempts to execute external tools within a compaction thread rather than the foreground, interactive session.

## **Targeted Resolution and Root Cause Synthesis**

Synthesizing the exhaustive architecture constraints, configuration precedence, protocol nuances, and historical vulnerabilities, we can perform a definitive root cause analysis of the systemic denial observed in specific third-party client integrations, such as the ZuberiChat deployment running on OpenClaw v2026.3.8.

The operating environment presents a scenario where tools.exec.host is set to "gateway" and tools.exec.ask is set to "always", while the sandbox.docker.network isolation is disabled. The exec-approvals.json database is empty, and the ZuberiChat client successfully connects, requesting the operator.approvals scope during its handshake. Despite this interactive posture, commands are denied outright without an approval card rendering.

## **The Diagnostic Chain of Failure**

1. **The Request Ingress**: The agent requests an execution. Because tools.exec.host is "gateway", the execution engine prepares to run the command directly on the host machine running the OpenClaw container daemon.2  
2. **The Security Boundary Evaluation**: The system evaluates the base security policy. Because tools.exec.security is not explicitly declared in the configuration override, it defaults to the highly restrictive allowlist mode for the gateway host.2  
3. **The Ask Policy Evaluation**: The system evaluates the human-in-the-loop requirement. The configuration explicitly mandates tools.exec.ask: "always".2 The system concludes that an approval broadcast is legally required to proceed.  
4. **The WebSocket Census and the Fatal Short-Circuit**: The Gateway prepares to broadcast the exec.approval.requested event. To do so, it evaluates all connected WebSocket clients to identify targets possessing the operator.approvals scope.

At this precise microsecond, the execution flow suffers a catastrophic logic failure. The observed symptom—a total lack of emitted WebSocket events combined with an immediate command denial—is the exact cryptographic signature of the v2026.2.22 "no approval-capable gateway clients" short-circuit.18

The Gateway believes no capable clients are connected, despite ZuberiChat explicitly requesting the scope in its handshake. The vulnerability lies in the critical architectural distinction between *requesting* a scope and *possessing* a scope within the authoritative paired.json identity cache. In token-authenticated deployments, particularly those hardened against CSWSH attacks, the Gateway is extraordinarily hostile to unauthorized scope elevation.29 If ZuberiChat attempts to negotiate the operator.approvals scope during the connect.challenge, but the underlying identity token bound to that connection has suffered from the documented scope degradation bug (where tokens rotate and strip elevated privileges down to merely operator.read 14), the Gateway silently rejects the scope elevation request at the WebSocket layer.

ZuberiChat maintains a live, functional WebSocket connection, allowing basic chat interactions, but operates entirely without the verified operator.approvals capability in the Gateway's internal memory space.

5. **The Fallback Execution**: Finding zero verified clients with the operator.approvals scope, the Gateway triggers the askFallback directive. Because the exec-approvals.json file is effectively empty, the system relies on the hardcoded system default for askFallback, which is deny.15 The Gateway immediately terminates the execution attempt, returning a denial to the agent runtime and halting the operation.

## **Actionable Remediation Strategies**

To transition from guess-and-check debugging to a deterministic system resolution, operators must intervene directly at the state caching layer to repair the cryptographic trust boundaries.

**Phase 1: Verification of Cryptographic Identity Scopes**

The paramount priority is confirming the true scopes authorized by the Gateway, circumventing any client-side assumptions. By executing a direct query against the identity cache on the gateway instance, the scope degradation can be immediately validated. Operators should execute the following command within the host environment:

Bash

docker compose exec openclaw-gateway openclaw devices list \--json

This diagnostic command outputs the full cryptographic state of all connected devices and their verified capabilities.23 If the ZuberiChat client entry lacks the "operator.approvals" string in its granted scopes array, the token degradation hypothesis is definitively confirmed.

**Phase 2: Manual Scope Restoration** If scope degradation has occurred, the immediate remedy involves repairing the persistent state file that governs device trust. The operator must edit the \~/.openclaw/devices/paired.json file within the persistent volume mounted to the Gateway container, manually appending "operator.approvals" to the specific device token array.24 Following this manual modification, a full restart of the OpenClaw service (openclaw gateway restart) forces the Node.js process to ingest the corrected access control list from the disk into active memory.

**Phase 3: Altering the Fallback Posture**

If the client application cannot reliably maintain the operator.approvals scope due to frequent token rotations, the architectural fail-safe can be carefully circumvented by altering the askFallback behavior. By modifying the exec-approvals.json file to explicitly define a more permissive fallback, the system will execute specific commands even when the user interface is logically disconnected or degraded.

| JSON Configuration Payload | Effect on Execution Flow |
| :---- | :---- |
| {"defaults": {"security": "allowlist", "ask": "on-miss", "askFallback": "allowlist"}} | Commands matching the persistent allowlist will execute even if no approval-capable client is connected. Unlisted commands will fail silently.14 |

By shifting the fallback policy from deny to allowlist, the system bypasses the hard execution drop.14 When the client interface fails the scope check, the Gateway will consult the local allowlist array. While ask: "always" theoretically supersedes the allowlist during standard interactive operation, relying on askFallback: allowlist introduces a complex duality where the system relies heavily on the local configuration file rather than the absent human operator. For API-driven environments, ensuring the exec-approvals.json file is correctly populated with the required operational binaries, and adjusting the fallback mechanisms, allows for the safe, predictable execution of pre-authorized patterns without relying on fragile WebSocket broadcast synchronization.

#### **Works cited**

1. OpenClaw/Moltbot Security: Analysis and Risk Mitigation for Agentic AI | Hunto AI, accessed March 14, 2026, [https://hunto.ai/blog/moltbot-security/](https://hunto.ai/blog/moltbot-security/)  
2. Exec Tool \- OpenClaw, accessed March 14, 2026, [https://docs.openclaw.ai/tools/exec](https://docs.openclaw.ai/tools/exec)  
3. Exec requires approval despite tools.exec.security: full · Issue \#1517 \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/issues/1517](https://github.com/openclaw/openclaw/issues/1517)  
4. openclaw/docs/tools/exec-approvals.md at main \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/blob/main/docs/tools/exec-approvals.md](https://github.com/openclaw/openclaw/blob/main/docs/tools/exec-approvals.md)  
5. Gateway Protocol \- OpenClaw, accessed March 14, 2026, [https://docs.openclaw.ai/gateway/protocol](https://docs.openclaw.ai/gateway/protocol)  
6. agent hooks and websocket events \- Friends of the Crustacean \- Answer Overflow, accessed March 14, 2026, [https://www.answeroverflow.com/m/1474467427776466954](https://www.answeroverflow.com/m/1474467427776466954)  
7. GHSA-8g75-q649-6pv6: OpenClaw's system.run approvals did not bind mutable script operands across approval and execution \- GitLab Advisory Database, accessed March 14, 2026, [https://advisories.gitlab.com/pkg/npm/openclaw/GHSA-8g75-q649-6pv6/](https://advisories.gitlab.com/pkg/npm/openclaw/GHSA-8g75-q649-6pv6/)  
8. GHSA-9868-vxmx-w862: OpenClaw Allowlist Bypass RCE \- Miggo Security, accessed March 14, 2026, [https://www.miggo.io/vulnerability-database/cve/GHSA-9868-vxmx-w862](https://www.miggo.io/vulnerability-database/cve/GHSA-9868-vxmx-w862)  
9. system.run allowlist bypass via shell line-continuation command substitution \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/security/advisories/GHSA-9868-vxmx-w862](https://github.com/openclaw/openclaw/security/advisories/GHSA-9868-vxmx-w862)  
10. tools.exec.safeBins sort long-option abbreviation bypass can skip exec approval in allowlist mode \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/security/advisories/GHSA-3c6h-g97w-fg78](https://github.com/openclaw/openclaw/security/advisories/GHSA-3c6h-g97w-fg78)  
11. Incomplete List of Disallowed Inputs in openclaw | CVE-2026-28363 | Snyk, accessed March 14, 2026, [https://security.snyk.io/vuln/SNYK-JS-OPENCLAW-15363104](https://security.snyk.io/vuln/SNYK-JS-OPENCLAW-15363104)  
12. approvals \- OpenClaw, accessed March 14, 2026, [https://docs.openclaw.ai/cli/approvals](https://docs.openclaw.ai/cli/approvals)  
13. Tried so many times to make this work. Never got it. \- Friends of the Crustacean, accessed March 14, 2026, [https://www.answeroverflow.com/m/1470918949398122708?cursor=B\_Bz5j52kR\_KcAlldmHJTqXXboXYO3KA-OST8h6gBGi1gxCggdwcKuV5atc9Fceyv3BNp\_o7V0SHDzSB09pkcptX4NaBjzAb34Gj1wTxdHuNQsmMZBuQwXfO-r4SckpNnDXqR7qklxrsTIk8NH3c0qkyJ2790M0ahjjsD-sycZ30xm6weBVbVAL\_LoA](https://www.answeroverflow.com/m/1470918949398122708?cursor=B_Bz5j52kR_KcAlldmHJTqXXboXYO3KA-OST8h6gBGi1gxCggdwcKuV5atc9Fceyv3BNp_o7V0SHDzSB09pkcptX4NaBjzAb34Gj1wTxdHuNQsmMZBuQwXfO-r4SckpNnDXqR7qklxrsTIk8NH3c0qkyJ2790M0ahjjsD-sycZ30xm6weBVbVAL_LoA)  
14. \[Bug\]: exec access blocked after update to 2026.2.22+ · Issue \#25652 \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/issues/25652](https://github.com/openclaw/openclaw/issues/25652)  
15. Exec Approvals \- OpenClaw, accessed March 14, 2026, [https://docs.openclaw.ai/tools/exec-approvals](https://docs.openclaw.ai/tools/exec-approvals)  
16. OpenClaw v2026.3.8 config JSON Schema (extracted from internal Zod definitions) \- gists · GitHub, accessed March 14, 2026, [https://gist.github.com/Kaspre/f8857f5b650378ae900103f11154111e](https://gist.github.com/Kaspre/f8857f5b650378ae900103f11154111e)  
17. \[heartbeat\] failed: EACCES: permission denied \- Friends of the Crustacean \- Answer Overflow, accessed March 14, 2026, [https://www.answeroverflow.com/m/1477454962526130347](https://www.answeroverflow.com/m/1477454962526130347)  
18. openclaw/openclaw v2026.2.22-beta.1 on GitHub \- NewReleases.io, accessed March 14, 2026, [https://newreleases.io/project/github/openclaw/openclaw/release/v2026.2.22-beta.1](https://newreleases.io/project/github/openclaw/openclaw/release/v2026.2.22-beta.1)  
19. One-click RCE on OpenClaw in under 2 hours with an Autonomous Hacking Agent | Ethiack, accessed March 14, 2026, [https://ethiack.com/news/blog/one-click-rce-openclaw](https://ethiack.com/news/blog/one-click-rce-openclaw)  
20. Approval timing \- Friends of the Crustacean \- Answer Overflow, accessed March 14, 2026, [https://www.answeroverflow.com/m/1478826355297615883](https://www.answeroverflow.com/m/1478826355297615883)  
21. openclaw/openclaw v2026.2.22 on GitHub \- NewReleases.io, accessed March 14, 2026, [https://newreleases.io/project/github/openclaw/openclaw/release/v2026.2.22](https://newreleases.io/project/github/openclaw/openclaw/release/v2026.2.22)  
22. exec-approvals.json security=full not respected — commands still gated \#26962 \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/issues/26962](https://github.com/openclaw/openclaw/issues/26962)  
23. Not receiving exec approval prompts \- Friends of the Crustacean \- Answer Overflow, accessed March 14, 2026, [https://www.answeroverflow.com/m/1471752269924929568](https://www.answeroverflow.com/m/1471752269924929568)  
24. \[Bug\]: Dashboard auto-paired devices missing operator.read/write scopes (2026.2.14) · Issue \#17187 · openclaw/openclaw \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/issues/17187](https://github.com/openclaw/openclaw/issues/17187)  
25. \[Bug\]: Token rotation causes "pairing required" errors \- scopes not preserved after rotation · Issue \#22067 \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/issues/22067](https://github.com/openclaw/openclaw/issues/22067)  
26. ClawJacked: OpenClaw Vulnerability Enables Full Agent Takeover \- OASIS Security, accessed March 14, 2026, [https://www.oasis.security/blog/openclaw-vulnerability](https://www.oasis.security/blog/openclaw-vulnerability)  
27. OpenClaw Bug Enables One-Click Remote Code Execution via Malicious Link, accessed March 14, 2026, [https://thehackernews.com/2026/02/openclaw-bug-enables-one-click-remote.html](https://thehackernews.com/2026/02/openclaw-bug-enables-one-click-remote.html)  
28. ClawJacked Flaw Lets Malicious Sites Hijack Local OpenClaw AI Agents via WebSocket, accessed March 14, 2026, [https://thehackernews.com/2026/02/clawjacked-flaw-lets-malicious-sites.html](https://thehackernews.com/2026/02/clawjacked-flaw-lets-malicious-sites.html)  
29. CVE-2026-25253: 1-Click RCE in OpenClaw Through Auth Token Exfiltration \- SOCRadar, accessed March 14, 2026, [https://socradar.io/blog/cve-2026-25253-rce-openclaw-auth-token/](https://socradar.io/blog/cve-2026-25253-rce-openclaw-auth-token/)  
30. Plugins \- OpenClaw Docs, accessed March 14, 2026, [https://docs.openclaw.ai/tools/plugin](https://docs.openclaw.ai/tools/plugin)  
31. Martian-Engineering/lossless-claw: Lossless Claw — LCM (Lossless Context Management) plugin for OpenClaw \- GitHub, accessed March 14, 2026, [https://github.com/Martian-Engineering/lossless-claw](https://github.com/Martian-Engineering/lossless-claw)  
32. openclaw 2026.3.7-beta.1 on Node.js NPM \- NewReleases.io, accessed March 14, 2026, [https://newreleases.io/project/npm/openclaw/release/2026.3.7-beta.1](https://newreleases.io/project/npm/openclaw/release/2026.3.7-beta.1)  
33. Releases · openclaw/openclaw \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/releases](https://github.com/openclaw/openclaw/releases)  
34. Openclaw keeps lying to me and doing nothing when it said it had started. \- Friends of the Crustacean \- Answer Overflow, accessed March 14, 2026, [https://www.answeroverflow.com/m/1481735654835486811](https://www.answeroverflow.com/m/1481735654835486811)