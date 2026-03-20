# Coaching Bridge — RTL-069

**Status:** Designing | **Priority:** P0 | **Executor:** CC
**Created:** Session 23 | 2026-03-19

---

## Purpose

Eliminate James as a copy-paste middleman between architect agents (Claude.ai) and Zuberi. Enable live coaching sessions where this architect writes a prompt, the bridge delivers it to Zuberi, captures her response, and returns it — all without James manually switching windows.

---

## Architecture

```
Architect (Claude.ai / Claude Desktop)
    ↓ writes prompt
CEG: /opt/zuberi/data/coaching/inbox/prompt.md
    ↓ detected by
PowerShell Bridge (KILO) — polls CEG every N seconds
    ↓ injects into
Claude Desktop / ZuberiChat (KILO window)
    ↓ captures response
PowerShell Bridge
    ↓ writes response
CEG: /opt/zuberi/data/coaching/outbox/response.md
    ↓ detected by
Architect reads from CEG via shell service
```

### Components

1. **Architect** — writes prompts, commits to CEG coaching inbox via shell service
2. **PowerShell Bridge** — runs on KILO, polls CEG inbox, injects into Claude Desktop, captures responses, posts back to CEG
3. **CEG coaching directories** — `/opt/zuberi/data/coaching/inbox/` and `/opt/zuberi/data/coaching/outbox/`
4. **n8n (optional)** — could orchestrate the polling/delivery instead of PowerShell doing it directly

### Why PowerShell on KILO

- Claude Desktop runs on KILO — must interact with Windows UI
- PowerShell has native access to Windows UI Automation API
- No install required — ships with Windows 11
- Can find UI elements by automation ID (position-independent)
- Can interact with clipboard, keyboard, mouse

---

## PowerShell Bridge — Detailed Design

### Core Loop

```
while ($running) {
    1. Poll CEG inbox for new prompt file
    2. If found: read content, delete from inbox
    3. Sanitize the prompt (security)
    4. Focus Claude Desktop window
    5. Find the chat input element via UI Automation
    6. Paste prompt text
    7. Send Enter
    8. Wait for response to complete (detect streaming end)
    9. Select and copy the response
    10. Sanitize the response (security)
    11. Write to CEG outbox
    12. Log the exchange
    13. Sleep N seconds, repeat
}
```

### UI Automation Approach

Use .NET System.Windows.Automation namespace:

```powershell
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

# Find Claude Desktop window
$root = [System.Windows.Automation.AutomationElement]::RootElement
$condition = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::NameProperty, "Zuberi"
)
$claudeWindow = $root.FindFirst("Children", $condition)
```

For finding the input field and response area, we need to inspect the Claude Desktop / ZuberiChat DOM. This is Electron-based — the UI tree will have specific automation IDs or control types we can target.

**Research needed:** Deep research on Electron app UI Automation tree structure for Claude Desktop and ZuberiChat (Tauri v2). The automation IDs and element hierarchy will determine whether this is clean or hacky.

### Response Detection

Detecting when Zuberi finishes responding is critical. Options:

1. **Poll for UI state change** — watch for the "stop" button to disappear or the input field to become enabled again
2. **Text stability** — copy response text every 500ms, when it stops changing for 2 seconds, it's done
3. **File watcher** — if using ZuberiChat, could watch the conversation file for a new entry
4. **Token counter** — watch the OpenClaw sessions endpoint for token count to stop increasing

Option 2 (text stability) is most reliable and platform-agnostic.

### Communication with CEG

Poll the inbox using HTTP to the shell service:

```powershell
# Check for new prompt
$check = Invoke-RestMethod -Uri "http://100.100.101.1:3003/command" -Method POST -Body '{"command":"ls /opt/zuberi/data/coaching/inbox/ 2>/dev/null"}' -ContentType "application/json"

# Read prompt
$prompt = Invoke-RestMethod -Uri "http://100.100.101.1:3003/command" -Method POST -Body '{"command":"cat /opt/zuberi/data/coaching/inbox/prompt.md"}' -ContentType "application/json"

# Write response back
$escaped = $responseText -replace '"', '\"'
$body = @{command="echo '$escaped' > /opt/zuberi/data/coaching/outbox/response.md"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://100.100.101.1:3003/command" -Method POST -Body $body -ContentType "application/json"
```

---

## Security Design

### Threats

| # | Threat | Mitigation |
|---|--------|------------|
| 1 | Unauthorized prompt injection — malicious file in inbox triggers unintended actions | Auth token required in prompt file header. Bridge rejects files without valid token. |
| 2 | Prompt injection via Zuberi's response — response contains instructions that manipulate the architect | Response sanitization — strip known injection patterns before returning to architect |
| 3 | Exfiltration — bridge sends data somewhere unexpected | Script is hash-verified at startup. No outbound connections except CEG:3003. |
| 4 | Script tampering — someone modifies the bridge to change behavior | SHA-256 hash check on startup. Script won't run if hash doesn't match stored value. |
| 5 | Runaway loop — infinite exchange burns through context | Max exchanges per session (configurable, default 20). Cooldown between exchanges (minimum 10 seconds). |
| 6 | Context exhaustion — bridge keeps injecting prompts into a full context | Check Zuberi's context usage before injecting. Abort if >80%. |

### Authentication

Each prompt file must contain a header line with an auth token:

```markdown
AUTH: <sha256-of-shared-secret + timestamp>
TIMESTAMP: <ISO-8601>
---
<actual prompt text>
```

Bridge validates:
- Token matches expected hash
- Timestamp is within 5 minutes (prevents replay)
- File is not empty after the header

### Rate Limiting

- Minimum 10 seconds between injections
- Maximum 20 exchanges per session
- Kill switch: create `/opt/zuberi/data/coaching/STOP` on CEG — bridge halts immediately

### Audit Log

Every exchange logged to `/opt/zuberi/data/coaching/audit.log`:

```
2026-03-19T20:15:30Z | INJECT | prompt_hash=abc123 | word_count=45
2026-03-19T20:15:55Z | CAPTURE | response_hash=def456 | word_count=230
2026-03-19T20:16:00Z | DELIVER | outbox/response.md written
```

---

## Target: Claude Desktop vs ZuberiChat

Two possible injection targets:

### Claude Desktop (claude.ai conversation)
- Pros: architect is already in this conversation, full context carried
- Cons: Electron app, need to research UI tree, Anthropic may change DOM between updates

### ZuberiChat (Tauri v2 / OpenClaw chat)
- Pros: we control the codebase, can add an API endpoint for programmatic injection
- Cons: different conversation from the architect's context, would need separate architect integration

**Recommended first target:** ZuberiChat / OpenClaw chat. We control it, and adding a REST endpoint for message injection is cleaner than UI scraping. The bridge becomes:

1. POST prompt to OpenClaw chat API
2. Poll for response via OpenClaw API
3. Return response to architect

This avoids UI automation entirely for the Zuberi side. PowerShell only needs to interact with Claude Desktop for the architect side — or the architect writes directly to CEG via this agent's bash tools, which already works.

**Simplest viable path:** This architect writes prompts to CEG. PowerShell bridge reads them and POSTs to OpenClaw's chat endpoint. Captures Zuberi's response. Writes back to CEG. This architect reads from CEG.

No UI automation needed at all if OpenClaw has a chat API we can call programmatically.

---

## Research Needed

1. **Does OpenClaw expose a chat/message API?** Check docs at https://docs.openclaw.ai/ for a REST endpoint to send messages and receive responses programmatically.
2. **If not, what's the ZuberiChat WebSocket protocol?** ZuberiChat connects via WebSocket — could we inject messages at that layer?
3. **Claude Desktop UI Automation tree** — if we need to interact with Claude Desktop, what are the automation IDs for the input field and response area?
4. **Electron accessibility** — does Claude Desktop expose a proper UI Automation tree or is it a single opaque webview?

---

## Implementation Order

1. Research OpenClaw chat API (may eliminate need for UI automation entirely)
2. Create CEG coaching directories
3. Build minimal PowerShell bridge (prompt delivery + response capture)
4. Add security layer (auth, rate limiting, audit)
5. End-to-end test: architect writes prompt → bridge delivers → Zuberi responds → architect reads response
6. Harden: hash verification, kill switch, context monitoring

---

## Saved Tasks (Deferred)

### yt-dlp install on CEG

Zuberi's next task after the bridge is working:

```
Install yt-dlp on CEG. One command:

curl -s -X POST http://100.100.101.1:3003/command -H "Content-Type: application/json" -d '{"command":"pip3 install --break-system-packages yt-dlp"}'

Verify:

curl -s -X POST http://100.100.101.1:3003/command -H "Content-Type: application/json" -d '{"command":"yt-dlp --version"}'

Report the version number.
```

### n8n tutorial playlist (9 videos)

After yt-dlp works, Zuberi processes:
https://www.youtube.com/watch?v=TFTLMQLozCI&list=PLlET0GsrLUL5bxmx5c1H1Ms_OtOPYZIEG

Save transcripts to `/opt/zuberi/data/learning/transcripts/`
Save extractions to `/opt/zuberi/data/learning/extractions/`
