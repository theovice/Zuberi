# **Technical Analysis of Execution Approval Mechanisms in OpenClaw Gateway Protocols**

The architectural design of the OpenClaw gateway emphasizes a strict security interlock between autonomous agents and their respective host environments. Central to this paradigm is the execution approval system, a distributed consensus mechanism that prevents unauthenticated or unreviewed command execution on host processors. For developers of third-party clients, such as the Tauri-based ZuberiChat, the primary challenge in rendering approval cards lies not in the user interface layer, but in the specific cryptographic and capability negotiation phases of the WebSocket handshake. Failure to correctly propagate device identity and capability claims results in a silent degradation of the client's authority, leading to the suppression of the critical exec.approval.requested events.

## **The Architectural Paradigm of Execution Approvals**

Execution approvals within the OpenClaw ecosystem serve as a high-fidelity guardrail for sandboxed agents attempting to interact with the underlying operating system of a gateway or a remote node.1 This safety mechanism is distinct from standard tool-call policies; while a tool may be permitted by the agent’s configuration, the specific execution on the host machine is subject to a secondary layer of scrutiny.1 The effective security posture is determined by the intersection of tools.exec.\* settings and global approval defaults, with the gateway invariably deferring to the more restrictive of the two configurations.2

The enforcement logic is decentralized. Approvals are executed on the host where the command is intended to run: either the gateway process itself for local operations or a node runner for remote tasks, such as those facilitated by the macOS companion app or a headless Linux node.1 This distinction is vital for understanding why a client might fail to receive events. If the gateway determines that no "approval-capable" clients are reachable, the system transitions to a fail-fast state to prevent agents from hanging in a permanent wait window.3

## **Deterministic Lifecycle of Approval Requests**

When an execution request is initiated by an agent, the ExecApprovalManager creates a pending state identified by a stable UUID.5 This lifecycle is highly deterministic, moving through stages of registration, broadcast, and resolution. During the broadcast phase, the gateway identifies all connected clients that meet the criteria for being "approval-capable." If this set of clients is empty and no external forwarding targets (such as Telegram or Discord) are configured, the gateway immediately expires the request.3 In such scenarios, the command either executes silently—if the askFallback is set to full—or is denied silently if the fallback is set to deny.1

| Approval State | Gateway Action | Result for Client |
| :---- | :---- | :---- |
| **Pending** | Broadcast exec.approval.requested | Renders approval card |
| **Resolved** | Emit exec.approval.resolved | Removes card/Shows success |
| **Expired** | Transition to askFallback | Silent execution or denial |
| **Denied** | Emit exec.denied system message | Shows error state |

The "silent" behavior observed in the ZuberiChat implementation is a symptomatic manifestation of the gateway's fail-fast logic. Because ZuberiChat is not recognized as an approval-capable client, the gateway treats it as non-existent for the purposes of the approval broadcast, leading to an immediate jump from request to fallback.3

## **The WebSocket Handshake and Cryptographic Identity**

The most frequent point of failure for custom OpenClaw clients is the first frame of the WebSocket connection. The OpenClaw protocol does not allow for a simple unauthenticated or token-only connection for administrative tasks.7 Instead, it mandates a multi-stage handshake that establishes a verifiable device identity.

## **Challenge-Response Sequence**

The connection sequence is initiated by the gateway sending a connect.challenge event immediately upon the establishment of the TCP/WebSocket stream.7 This challenge includes a server-side nonce and a timestamp. A client that ignores this event and sends a connect request containing only an authentication token will find its requested scopes stripped.9

| Handshake Order | Frame Type | Payload Key Fields | Purpose |
| :---- | :---- | :---- | :---- |
| 1 | event | connect.challenge (nonce, ts) | Server-side entropy for signature |
| 2 | req | connect (device, auth, caps) | Client identity and claims |
| 3 | res | hello-ok (protocolVersion) | Handshake confirmation |

The connect RPC must include a device object that contains the client's unique ID, its public key, and a signature generated using an Ed25519 keypair.7 This signature is calculated over the concatenation of the challenge nonce and the timestamp. This cryptographic proof is mandatory for any client requesting scopes such as operator.approvals or operator.admin.7

## **Silent Scope Stripping in v2026.2.9 and Later**

A critical architectural change introduced in version v2026.2.9 implemented a "default-deny" policy for clients failing to provide a device identity.9 If a client sends a connect request with a valid auth.token but omits the device field, the gateway responds with ok: true. However, internally, the gateway sets the connection’s granted scopes to an empty array.9

This "silent stripping" is the primary reason why ZuberiChat believes it has a clean connection while receiving no approval events. The client receives a successful response to its connect RPC, but it lacks the operator.approvals scope required to enter the broadcast filter for execution requests.3 In the gateway’s view, the connection is authorized only for unprivileged, public-tier operations.

## **Capabilities Negotiation and Client Metadata**

Beyond scope negotiation, the OpenClaw protocol uses a capability-based system to register clients for specific high-frequency or rich-media event streams. This is managed via the caps array in the connect RPC parameters.7

## **The Role of tool-events and structured-commands**

Research into the built-in Dashboard and TUI clients reveals that they do not simply request scopes; they also advertise their ability to process complex payloads.13 The tool-events capability is required for a client to be registered as a recipient for tool-related event broadcasts.14 More importantly, the structured-commands capability, introduced in a protocol proposal to avoid regex-parsing of text responses, allows the gateway to send machine-readable JSON objects for decision-making modals.13

Approval cards are technically a form of structured command or decision request. While the documentation for the exec.approval.requested event implies a broadcast to all connections with operator.approvals, the internal implementation often filters for clients that can render the response.3 If a client does not advertise structured-commands or tool-events, the gateway may optimize traffic by omitting these rich events.13

## **Taxonomy of Client Metadata**

The connect RPC includes several metadata fields that the gateway uses to categorize the connection. The built-in Control UI provides a specific client object and a clientMode to signal its role as a primary operator interface.10

| Metadata Field | Recommended Value | Impact |
| :---- | :---- | :---- |
| client.id | openclaw-control-ui or unique | Used for device pairing lookups |
| client.mode | webchat | Primary signal for UI-capable clients |
| role | operator | Establishes the authorization tier |
| platform | Win32, Darwin, etc. | Used for telemetry and UI scaling |

Custom clients that fail to provide a clientMode or an identified clientId may be deprioritized by the ExecApprovalManager when determining if an "approval-capable" client is active.15 For ZuberiChat, identifying as mode: "webchat" is essential to ensure the gateway recognizes it as a surface capable of rendering interactive cards.13

## **Event Subscription and Routing Determinants**

A common point of confusion for third-party developers is whether clients must explicitly subscribe to approval events after the handshake. The OpenClaw protocol utilizes an implicit subscription model based on authenticated scopes and declared capabilities.7

## **Implicit Broadcast via Scopes**

There is no subscribe RPC for execution approvals. Instead, the gateway’s broadcast engine automatically identifies all connections that possess the operator.approvals scope and sends the exec.approval.requested event to them.3 However, the key caveat is that this scope must be *granted* by the gateway, not just *requested* by the client. As established, if the device identity is missing, the grant is silently failed, effectively "unsubscribing" the client from the approval stream.9

## **"Approval-Capable" Logic in the Gateway**

The gateway determines the availability of approvers by checking the runtime context for clients that satisfy the following criteria:

1. **Scope Verification**: The connection must have a verified operator.approvals or operator.admin scope.3  
2. **Reachable Targets**: The ExecApprovalManager must detect at least one active WebSocket connection with these scopes or a configured channel (Telegram/Discord).3  
3. **Active Session**: For mode: "session" approvals, the client must be associated with the specific session ID generating the request.17

If ZuberiChat is connecting as a general operator but not providing session-specific identifiers or a valid device identity, it fails both the scope verification and the reachable target check, causing the gateway to fall back to silent modes.3

## **Source Code Reference: The Control UI Handshake**

The implementation within the openclaw repository, specifically in ui/src/ui/gateway.ts and associated schema definitions, provides the definitive template for a working operator connection.10 The built-in Control UI constructs its connect RPC with a high degree of specificity to ensure it passes all gateway-side validation blocks.

## **The Connect RPC Schema**

Analysis of the frames.ts schema and the gateway.ts implementation reveals the following structure used by the functioning webchat client 10:

JSON

{  
  "type": "req",  
  "id": "uuid-v4-request-id",  
  "method": "connect",  
  "params": {  
    "minProtocol": 3,  
    "maxProtocol": 3,  
    "client": {  
      "id": "openclaw-control-ui",  
      "version": "2026.3.8",  
      "platform": "Win32",  
      "mode": "webchat"  
    },  
    "role": "operator",  
    "scopes": \[  
      "operator.admin",  
      "operator.approvals",  
      "operator.pairing",  
      "operator.read",  
      "operator.write"  
    \],  
    "device": {  
      "id": "cryptographic-device-id",  
      "publicKey": "ed25519-public-key",  
      "signature": "ed25519-signature-of-nonce",  
      "signedAt": 1769763506654,  
      "nonce": "nonce-from-challenge"  
    },  
    "caps": \["tool-events", "structured-commands"\],  
    "auth": {  
      "token": "gateway-auth-token"  
    },  
    "userAgent": "Mozilla/5.0...",  
    "locale": "en-US"  
  }  
}

This payload satisfies all five requirements for approval-capable status: it provides a valid role, requests the necessary scopes, proves identity via the device signature, declares processing capabilities via caps, and identifies as a webchat mode.10

## **Comparative Analysis of ZuberiChat and Control UI**

The delta between the current ZuberiChat implementation and the working Control UI implementation highlights three primary areas of failure.

| Feature | ZuberiChat (v1.0.19) | OpenClaw Control UI | Gap Criticality |
| :---- | :---- | :---- | :---- |
| **Identity** | Auth token only | Ed25519 Device Identity | **High** (Causes silent scope drop) |
| **Capabilities** | None declared | tool-events, structured-commands | **Medium** (Filters rich events) |
| **Client Mode** | Missing | mode: "webchat" | **Medium** (Affects routing logic) |
| **Handshake** | Sends connect immediately | Waits for connect.challenge | **High** (Signature verification fails) |

The most significant issue is the "silent scope drop." Because ZuberiChat does not provide the device object, the gateway connection is technically unauthenticated for administrative purposes, despite the inclusion of a valid token.9 Consequently, the gateway does not grant the operator.approvals scope, and the connection is ignored during the approval broadcast.3

## **Diagnostic Steps for Implementation Recovery**

To restore approval card functionality in ZuberiChat, the connection logic must be refactored to comply with the secure device pairing protocol.

## **Implementation of the Ed25519 Handshake**

Since ZuberiChat is built on Tauri, the cryptographic operations should ideally be handled in the Rust backend to ensure access to robust Ed25519 libraries and secure key storage.

1. **Challenge Capture**: The client must listen for the connect.challenge event immediately after the WebSocket opens.7  
2. **Signature Generation**: The client must sign the challenge nonce using a persistent Ed25519 keypair. If no keypair exists, one must be generated and paired with the gateway.7  
3. **RPC Construction**: The connect RPC must include the device parameters, ensuring the id matches the paired device ID in the gateway’s paired.json store.10

## **Correcting Capability Claims**

The caps array must be populated with at least \["tool-events", "structured-commands"\].13 The tool-events capability ensures that any execution-related updates are streamed to the client, while structured-commands signals to the gateway that the client is capable of rendering the machine-readable decision data required for approval cards.13

## **Verifying Granted Scopes**

The client must not assume that requested scopes are granted just because the connect response is ok: true. A robust implementation should check the auth.scopes or a warnings array in the connect response payload (if implemented in newer gateway versions) to verify that operator.approvals is active.9 If the scopes are missing, the client should surface a "pairing required" or "authentication error" message to the user rather than proceeding silently.

## **Future Outlook and Protocol Evolution**

The OpenClaw gateway is moving toward a zero-trust architecture where all operator connections are tied to unique hardware identities. The "role-upgrade" mechanism ensures that a single device can act as both a node (providing capabilities) and an operator (providing control), but this requires clear management of tokens across rotation cycles.19

As the protocol evolves, additional capabilities such as exec-approvals may be formalized. However, current research indicates that the existing structured-commands capability and operator.approvals scope are the primary gatekeepers for the exec.approval.requested event.3 For third-party developers, maintaining parity with the built-in Control UI's handshake is the most effective strategy for ensuring long-term compatibility with the gateway's security interlock.

## **Conclusions and Technical Recommendations**

The failure of ZuberiChat to receive execution approval events is not a bug in the gateway's event dispatching but a failure of the client to satisfy the gateway's heightened security requirements for administrative operators. The "clean connection" confirmed by ZuberiChat (v1.0.19) is a low-privilege session with zero granted scopes due to the absence of a verifiable device identity.

To resolve this, the following targeted fixes are recommended:

1. **Implement the Ed25519 Handshake**: Do not send the connect RPC until the connect.challenge event is received. Sign the nonce and provide the device object in the connection parameters.  
2. **Identify as a Webchat Mode**: Include client: { mode: "webchat", id: "zuberichat" } in the connect params to signal UI capability to the ExecApprovalManager.  
3. **Declare Rich Capabilities**: Add caps: \["tool-events", "structured-commands"\] to ensure the client is registered for the structured decision events used by approval cards.  
4. **Verify the Grant**: Inspect the payload of the connect response. If the scopes array does not include operator.approvals, the client must treat the session as unauthenticated for approvals and notify the user to complete the device pairing process.

By implementing these cryptographic and metadata requirements, ZuberiChat will satisfy the criteria for being an "approval-capable" client, allowing the gateway to include it in the exec.approval.requested broadcast and enabling the successful rendering of host execution approval cards.

#### **Works cited**

1. Exec Approvals \- OpenClaw, accessed March 14, 2026, [https://docs.openclaw.ai/tools/exec-approvals](https://docs.openclaw.ai/tools/exec-approvals)  
2. openclaw/docs/tools/exec-approvals.md at main \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/blob/main/docs/tools/exec-approvals.md](https://github.com/openclaw/openclaw/blob/main/docs/tools/exec-approvals.md)  
3. \[Bug\]: Exec approval delay of 3-18 minutes after gateway restart despite security=full, ask=off \#22144 \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/issues/22144](https://github.com/openclaw/openclaw/issues/22144)  
4. \[Bug\]: nodes run / system.run hangs on headless gateway even with security=full, ask=off \#17322 \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/issues/17322](https://github.com/openclaw/openclaw/issues/17322)  
5. Telegram: exec approval messages should include tap-to-copy /approve commands \#24086, accessed March 14, 2026, [https://github.com/openclaw/openclaw/issues/24159/linked\_closing\_reference?reference\_location=REPO\_ISSUES\_INDEX](https://github.com/openclaw/openclaw/issues/24159/linked_closing_reference?reference_location=REPO_ISSUES_INDEX)  
6. \[Bug\]: Approval Service Permanently Hung with Timeouts After Security Update (IDs: ac4db7de, 5ee78640) \#21083 \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/issues/21083](https://github.com/openclaw/openclaw/issues/21083)  
7. Gateway Protocol \- OpenClaw, accessed March 14, 2026, [https://docs.openclaw.ai/gateway/protocol](https://docs.openclaw.ai/gateway/protocol)  
8. openclaw/docs/concepts/architecture.md at main \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/blob/main/docs/concepts/architecture.md](https://github.com/openclaw/openclaw/blob/main/docs/concepts/architecture.md)  
9. Connect response should warn when scopes are silently stripped due to missing device identity \#17570 \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/issues/17570](https://github.com/openclaw/openclaw/issues/17570)  
10. \[SOLVED\] \[Bug\]: After upgrading from Moltbot to Openclaw, I can't connect to the gateway. \#4529 \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/issues/4529](https://github.com/openclaw/openclaw/issues/4529)  
11. \[Bug\]: v2026.2.14: Critical Authentication Loops and Scope Validation Failures in Gateway · Issue \#17523 \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/issues/17523](https://github.com/openclaw/openclaw/issues/17523)  
12. Token-auth WebSocket connections have all scopes stripped when no paired device · Issue \#18560 \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/issues/18560](https://github.com/openclaw/openclaw/issues/18560)  
13. Feature: Structured Command Responses via Client Capability · Issue \#12594 \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/issues/12594](https://github.com/openclaw/openclaw/issues/12594)  
14. \[Regression\] Tool use broken for moonshot/kimi-k2.5 after v2026.2.3 — tool-events capability not registered for all client paths · Issue \#9413 \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/issues/9413](https://github.com/openclaw/openclaw/issues/9413)  
15. openclaw/src/gateway/protocol/schema/frames.ts at main \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/blob/main/src/gateway/protocol/schema/frames.ts](https://github.com/openclaw/openclaw/blob/main/src/gateway/protocol/schema/frames.ts)  
16. \[Bug\]: Dashboard auto-paired devices missing operator.read/write scopes (2026.2.14) · Issue \#17187 · openclaw/openclaw \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/issues/17187](https://github.com/openclaw/openclaw/issues/17187)  
17. Discord bot does not receive exec.approval.requested events — approval forwarding and /approve both broken · Issue \#22988 · openclaw/openclaw \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/issues/22988](https://github.com/openclaw/openclaw/issues/22988)  
18. openclaw/ui/src/ui/gateway.ts at main \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/blob/main/ui/src/ui/gateway.ts](https://github.com/openclaw/openclaw/blob/main/ui/src/ui/gateway.ts)  
19. \[Bug\]: Token rotation causes "pairing required" errors \- scopes not preserved after rotation · Issue \#22067 \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/issues/22067](https://github.com/openclaw/openclaw/issues/22067)  
20. \[Bug\]: macOS app can stay stuck on generic 'pairing required' after node-\>operator upgrade approval · Issue \#44672 \- GitHub, accessed March 14, 2026, [https://github.com/openclaw/openclaw/issues/44672](https://github.com/openclaw/openclaw/issues/44672)