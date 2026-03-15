# Approval Cards — Architecture and Debug History
# Last updated: 2026-03-15 | Session 21

## Goal

Every exec command Zuberi runs shows an approval card in ZuberiChat. James clicks Allow Once / Allow Always / Deny. Graduated trust: Allow Always builds a cache, reducing friction over time.

## Current State (Session 21 end)

- Ed25519 device identity: BUILT (v1.0.20-v1.0.22)
- v2 signing payload: CORRECT (signature accepted by gateway)
- Device pairing: DONE (ZuberiChat in paired.json)
- Approval cards rendering: NOT WORKING
- Config: dangerouslyDisableDeviceAuth=true, security=full, ask=always
- Zuberi is online and can execute commands, but no approval gating

## Root Cause Chain (discovered Session 21)

### Layer 1: URL token vs connect RPC (fixed v1.0.19)
ZuberiChat used ?token= in WebSocket URL. Gateway treated this as pre-authenticated, rejected subsequent connect RPC with "connect is only valid as the first request." Scopes never negotiated.
Fix: removed token from URL, send via connect RPC.

### Layer 2: Missing device identity (fixed v1.0.20)
Gateway silently strips ALL scopes to empty array when connect RPC lacks device object. Client receives ok:true but has zero privileges for approvals.
Fix: Ed25519 keypair in Rust, challenge-response signing.

### Layer 3: Wrong signing format (fixed v1.0.21)
crypto.rs signed raw bytes (nonce || timestamp). Gateway expects v2 pipe-delimited UTF-8 string.
Fix: v2 payload format: v2|{deviceId}|{clientId}|{clientMode}|{role}|{scopes}|{signedAtMs}|{token}|{nonce}

### Layer 4: Queue flush before handshake (fixed v1.0.22)
On reconnect, stale queued messages sent before connect RPC → "first request must be connect."
Fix: drop stale queue instead of flushing.

### Layer 5: Nonce race condition (fixed v1.0.22)
sign_challenge from connection N-1 completes after connection N opens, sending wrong nonce.
Fix: connectionGenRef counter, checked before sending.

### Layer 6: Metadata pinning mismatch (fixed Session 21)
paired.json had platform: "win32" (lowercase) but ZuberiChat sends "Win32". Also had deviceFamily: "desktop" but ZuberiChat sends none.
Fix: corrected paired.json entries.

### Layer 7: Origin mismatch (OPEN)
Vite dev server uses origin http://localhost:3000. Tauri webview uses http://tauri.localhost. The signing payload may include origin-sensitive data, or the gateway's origin validation differs.
Status: not fully debugged. Signature works from localhost:3000, fails from tauri.localhost after gateway restart.

### Layer 8: security:full bypasses approval pipeline (OPEN)
With security:full, commands execute without entering the ask pipeline at all. Cards never generated.
With security:allowlist + ask:always, commands should show cards — but this requires device auth to be stable (Layer 7).

## What's Needed to Complete

1. Stabilize Ed25519 across gateway restarts with security:allowlist
2. Handle tauri.localhost origin in signing or gateway config
3. Set security:allowlist + ask:always
4. Set dangerouslyDisableDeviceAuth:false
5. Test: card appears, user clicks Allow, command executes

## Gateway Exec Approval Pipeline (from deep research)

```
Agent calls exec
  → Resolve execution host (sandbox|gateway|node)
  → Security boundary (deny|allowlist|full)
    → If full: skip to execution (NO approval)
    → If allowlist + command not cached: proceed to ask
  → Ask policy (off|on-miss|always)
    → If always: require approval regardless of cache
  → WebSocket census: any approval-capable clients?
    → Requirements: operator.approvals GRANTED + caps + webchat mode
    → If zero: askFallback fires (default: deny)
    → If found: emit exec.approval.requested
  → Client renders card
  → User decides
  → Client sends exec.approval.resolve
  → Gateway executes or denies
```

## Connect RPC Schema (working)

```json
{
  "type": "req",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "openclaw-control-ui",
      "version": "1.0.22",
      "platform": "Win32",
      "mode": "webchat"
    },
    "role": "operator",
    "scopes": ["operator.admin", "operator.approvals", "operator.pairing", "operator.read", "operator.write"],
    "device": {
      "id": "8fe4c29ca97ba8cebac24547495f77095aacef1163321263c9dca1a333808681",
      "publicKey": "x_Q7OG-zTwUgOprRijLTiUQbypXJq6J9C8p4RdSI_W4",
      "signature": "<base64url-no-pad>",
      "signedAt": 1773542400000,
      "nonce": "<from connect.challenge>"
    },
    "caps": ["tool-events", "structured-commands"],
    "auth": {"token": "<gateway-token>"}
  }
}
```

## Files Changed (v1.0.18-v1.0.22)

- src/lib/permissionPolicy.ts — shell service detection (v1.0.18)
- src/components/chat/ClawdChatInterface.tsx — connect RPC, challenge-response flow, caps, mode
- src/hooks/useWebSocket.ts — queue flush fix, handshake gating
- src-tauri/src/crypto.rs — Ed25519 key management + v2 payload signing
- src-tauri/src/main.rs — mod crypto + sign_challenge command registration
- src-tauri/Cargo.toml — ed25519-dalek, rand, base64, sha2, hex
