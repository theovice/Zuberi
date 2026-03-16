# Exec Approval Flow — OpenClaw Gateway Protocol
# Extracted from Session 21 deep research and debugging
# See also: research/approval-card-rendering.md for client handshake details

## Pipeline

```
Agent calls exec tool
  ↓
Resolve execution host (sandbox | gateway | node)
  ↓
Security boundary evaluation
  - security: "deny"      → block all
  - security: "allowlist"  → check exec-approvals.json cache
  - security: "full"       → skip to ask policy (NO security check)
  ↓
Ask policy evaluation
  - ask: "off"       → execute immediately
  - ask: "on-miss"   → ask only if command not in cached allowlist
  - ask: "always"    → always ask regardless of cache
  ↓
WebSocket census: any approval-capable clients?
  Requirements:
    - operator.approvals scope GRANTED (not just requested)
    - caps: ["tool-events", "structured-commands"]
    - client.mode: "webchat"
    - Scope only granted with valid Ed25519 device identity
  ↓
If zero capable clients:
  → askFallback fires
    - "deny" (default): block command
    - "allowlist": allow if cached
    - "full": execute immediately
  ↓
If capable client found:
  → emit exec.approval.requested event to all capable clients
  → Client renders approval card
  → User clicks Allow Once / Allow Always / Deny
  → Client sends exec.approval.resolve RPC
  → Gateway executes or denies
```

## Key Discovery: Session-Level Override

The session file (sessions.json) contains an `execAsk` field that OVERRIDES the global `tools.exec.ask` config. This was cached as "off" from a previous configuration, silently bypassing the approval pipeline regardless of what openclaw.json said.

**Always check sessions.json when exec behavior doesn't match config.**

Path: `/home/node/.openclaw/agents/main/sessions/sessions.json`
Host: `C:\Users\PLUTO\openclaw_config\agents\main\sessions\sessions.json`

## Key Discovery: security:"full" Bypasses Ask

With `security: "full"`, the gateway skips the security check AND the ask pipeline entirely. Commands execute immediately. This means `security: "full" + ask: "always"` does NOT produce approval cards.

The correct combination for cards: `security: "allowlist" + ask: "always"` — but this requires device auth to be stable (currently broken on restart).

## askFallback Valid Values

- "deny" (default) — block if no approver available
- "allowlist" — allow if command is in cached allowlist
- "full" — execute regardless

Cannot be set to "allow" or "ask" — those are invalid.

## Sources

- Exec Approvals docs: https://docs.openclaw.ai/tools/exec-approvals
- Gateway Protocol: https://docs.openclaw.ai/gateway/protocol
- GitHub issues: #22144 (init delay), #17570 (silent scope strip), #18560 (token-auth scope strip)
- Gateway source: /app/dist/gateway-cli-C2ZZYgwu.js, /app/dist/call-BfhGytph.js
