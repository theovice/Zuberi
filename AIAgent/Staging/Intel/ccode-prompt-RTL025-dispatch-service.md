# Ccode Prompt: RTL-025 — HTTP Dispatch Service on CEG:3003

## Context

Zuberi runs inside OpenClaw's Docker container on KILO (100.127.23.52). The container can curl to CEG services over Tailscale (100.100.101.1) but cannot SSH to CEG because the SSH private key is not mounted into the container. Every other CEG service (SearXNG :8888, n8n :5678, CXDB :9009/9010, Kanban :3001, Usage Tracker :3002) is consumed by Zuberi via HTTP/curl.

This task builds a small HTTP dispatch service on CEG:3003 that accepts task prompts via POST, runs ccode locally on CEG, logs usage to the tracker on :3002, and returns the result as JSON. This completes the Zuberi → ccode pipeline without exposing SSH keys or credentials to OpenClaw's container.

**Target machine:** CEG (ssh ceg — `ssh -i ~/.ssh/id_ed25519 ceg@100.100.101.1`)
**Workspace on KILO:** `C:\Users\PLUTO\openclaw_workspace\`
**Ccode CLI on CEG:** `~/.local/bin/claude` (v2.1.63)
**Existing dispatch wrapper:** `/opt/zuberi/scripts/ccode-dispatch.sh`
**Existing usage tracker:** CEG:3002 (systemd service, POST /log to record events)
**Tailscale IPs:** KILO 100.127.23.52, CEG 100.100.101.1

Kill any existing pnpm tauri dev process before starting work.

## Prerequisites — Verify Before Proceeding

Before building anything, confirm these are working:

**1. Ccode CLI is authenticated:**
```bash
ssh ceg '~/.local/bin/claude -p "Reply with only the word VERIFIED" --output-format json --max-turns 1'
```
Expected: JSON response containing "VERIFIED". If this fails with an auth error, STOP and report — James needs to configure the API key first. Do not proceed without confirmed auth.

**2. Usage tracker is healthy:**
```bash
ssh ceg 'curl -s http://100.100.101.1:3002/health'
```
Expected: JSON with status "ok" and an event count.

**3. Existing dispatch wrapper exists:**
```bash
ssh ceg 'cat /opt/zuberi/scripts/ccode-dispatch.sh'
```
Report its contents — we may reuse or replace it.

Report all three results before proceeding to Task 1.

## Task 1: Build the HTTP Dispatch Service

Create the file `/opt/zuberi/services/ccode-dispatch/server.js` on CEG.

The service must:

1. **Listen on 100.100.101.1:3003 only** (Tailscale interface, NOT 0.0.0.0)
2. **Accept POST /dispatch** with JSON body:
   ```json
   {
     "task": "The prompt to send to ccode",
     "model": "claude-sonnet-4-5-20250929",
     "max_turns": 5,
     "project": "optional-project-dir",
     "timeout": 300
   }
   ```
   - `task` is required. All other fields have defaults.
   - `model` defaults to `claude-sonnet-4-5-20250929` (Sonnet for cost efficiency).
   - `max_turns` defaults to 5.
   - `timeout` defaults to 300 seconds (5 minutes).
   - `project` is optional — if provided, ccode runs with `--project-dir <path>`.

3. **Execute ccode** by spawning:
   ```bash
   ~/.local/bin/claude -p '<task>' --model <model> --output-format json --max-turns <max_turns>
   ```
   Add `--project-dir <project>` only if project is provided.

4. **Enforce concurrency limit of 1** — only one ccode dispatch at a time. If a request arrives while another is running, return 429 with `{"error": "Dispatch already in progress", "retry_after": 30}`.

5. **Enforce request timeout** — kill the ccode process if it exceeds the timeout value. Return 504 with `{"error": "Dispatch timed out", "timeout": <seconds>}`.

6. **Log usage to tracker** after each successful dispatch by POSTing to `http://100.100.101.1:3002/log` with:
   ```json
   {
     "type": "ccode-dispatch",
     "model": "<model used>",
     "task_preview": "<first 100 chars of task>",
     "duration_ms": <elapsed time>,
     "success": true/false
   }
   ```

7. **Return the response** as JSON:
   ```json
   {
     "success": true,
     "model": "claude-sonnet-4-5-20250929",
     "result": "<ccode output>",
     "duration_ms": 12345
   }
   ```
   On error:
   ```json
   {
     "success": false,
     "error": "<error message>",
     "duration_ms": 12345
   }
   ```

8. **GET /health** returns:
   ```json
   {
     "status": "ok",
     "service": "ccode-dispatch",
     "port": 3003,
     "busy": false,
     "uptime": 12345
   }
   ```

9. **Rate limit:** Maximum 20 dispatches per hour. After that, return 429 with `{"error": "Hourly rate limit exceeded", "retry_after": <seconds until reset>}`.

**Implementation constraints:**
- Use only Node.js built-in modules (http, child_process, etc.) — no npm dependencies.
- No jq anywhere.
- Parse JSON manually — do not rely on external tools.
- The service must handle ccode outputting large responses (up to 100KB+).
- Capture both stdout and stderr from the ccode process.

## Task 2: Create systemd Service

Create the systemd unit file at `/etc/systemd/system/ccode-dispatch.service` on CEG:

```ini
[Unit]
Description=Zuberi Ccode Dispatch Service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ceg
Environment=HOME=/home/ceg
Environment=PATH=/home/ceg/.local/bin:/usr/local/bin:/usr/bin:/bin
WorkingDirectory=/opt/zuberi/services/ccode-dispatch
ExecStart=/usr/bin/node /opt/zuberi/services/ccode-dispatch/server.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Then enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable ccode-dispatch
sudo systemctl start ccode-dispatch
sudo systemctl status ccode-dispatch
```

Verify it's running:
```bash
curl -s http://100.100.101.1:3003/health
```

## Task 3: Configure UFW

Add firewall rule for port 3003 on Tailscale interface only:
```bash
sudo ufw allow in on tailscale0 to any port 3003 proto tcp comment "Zuberi ccode dispatch"
sudo ufw status numbered
```

Verify from KILO-side (if possible) or confirm the rule is in place.

## Task 4: Test End-to-End Dispatch

Run a test dispatch from CEG itself first:
```bash
curl -s -X POST http://100.100.101.1:3003/dispatch \
  -H "Content-Type: application/json" \
  -d '{"task": "Reply with only the word OPERATIONAL and nothing else."}' | head -c 2000
```

Expected: JSON with `"success": true` and result containing "OPERATIONAL".

Then verify usage was logged:
```bash
curl -s http://100.100.101.1:3002/stats/5h
```

Expected: at least one new event of type "ccode-dispatch".

## Task 5: Create Workspace Skill for Dispatch

Create `C:\Users\PLUTO\openclaw_workspace\skills\ccode-dispatch\SKILL.md` on KILO with this content:

```markdown
---
name: ccode-dispatch
description: Dispatch coding tasks to Claude Code running on CEG. Use when a task requires code execution, file manipulation, builds, tests, or any work that needs a full development environment beyond your sandbox.
---

# Ccode Dispatch — Sub-Agent on CEG

You can delegate coding and development tasks to Claude Code running on CEG (100.100.101.1:3003). Claude Code has full filesystem access, can install packages, run tests, and execute shell commands on CEG.

## When to Dispatch

- Code changes that need testing (run tests, verify builds)
- Package installation or dependency management
- File manipulation requiring a real filesystem
- Git operations (commits, branch management)
- Any task that fails in your sandbox due to missing tools

## When NOT to Dispatch

- Simple conversation, planning, or writing tasks
- Tasks you can handle with your existing skills (search, kanban, n8n)
- Trivial questions — dispatch costs real money (~$0.05-0.15 per call)

## How to Dispatch

```bash
curl -s -X POST http://100.100.101.1:3003/dispatch \
  -H "Content-Type: application/json" \
  -d '{"task": "YOUR_DETAILED_TASK_PROMPT", "max_turns": 5}'
```

### Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| task | Yes | — | The prompt/instructions for Claude Code |
| model | No | claude-sonnet-4-5-20250929 | Model to use (Sonnet for cost, Opus for complex) |
| max_turns | No | 5 | Max agentic turns (higher = more thorough but costly) |
| project | No | — | Project directory on CEG for context |
| timeout | No | 300 | Timeout in seconds |

### Response Format

Success:
```json
{"success": true, "model": "...", "result": "...", "duration_ms": 12345}
```

Error:
```json
{"success": false, "error": "...", "duration_ms": 12345}
```

## Cost Awareness

- Each dispatch costs ~$0.05-0.15 at Sonnet rates
- Monthly cap: $20 (set on platform.claude.com)
- Check budget before heavy dispatch sessions:
  ```bash
  curl -s http://100.100.101.1:3002/limits
  ```
- AGENTS.md requires MUST CONFIRM for dispatches estimated over $1.00

## Dispatch Pattern

1. **Evaluate** — Is this task beyond your sandbox capabilities?
2. **Announce** — Tell James: "This requires code execution — dispatching to ccode on CEG."
3. **Compose** — Write a self-contained prompt. Ccode has NO context from your conversation.
4. **Dispatch** — Send via curl to CEG:3003
5. **Interpret** — Parse the response. Summarize for James. Do NOT dump raw output.
6. **Log** — Usage is auto-logged to CEG:3002. Report cost estimate to James.

## Health Check

```bash
curl -s http://100.100.101.1:3003/health
```

## Important

- Only ONE dispatch runs at a time. Concurrent requests return 429.
- Max 20 dispatches per hour (rate limited).
- Dispatch timeout: 5 minutes default. Increase for long tasks.
- The API key is stored securely on CEG — never in workspace files.
- Parse responses with grep/sed — no jq available.
```

## Task 6: Update TOOLS.md

Open `C:\Users\PLUTO\openclaw_workspace\TOOLS.md` on KILO.

**6a.** Find the line that starts with `For detailed skill instructions, read:` and append `, `skills/ccode-dispatch/SKILL.md`` to the end of that line.

**6b.** Find the Quick Commands section (or equivalent). Add a new subsection for ccode dispatch:

```
### Ccode Dispatch (CEG:3003)
# Health check
curl -s http://100.100.101.1:3003/health

# Dispatch a task
curl -s -X POST http://100.100.101.1:3003/dispatch -H "Content-Type: application/json" -d '{"task": "YOUR_TASK"}'

# Check usage budget
curl -s http://100.100.101.1:3002/limits
```

**6c.** Read the current version number at the top of TOOLS.md. Increment the patch version by one. Add to the version history table:

```
| NEW_VERSION | 2026-03-02 | Ccode dispatch service skill added (CEG:3003). Dispatch commands added to quick reference. |
```

## Task 7: Verify Everything

**7a.** Confirm service is running:
```bash
ssh ceg 'systemctl is-active ccode-dispatch'
```

**7b.** Confirm skill file exists:
```powershell
Get-Content "C:\Users\PLUTO\openclaw_workspace\skills\ccode-dispatch\SKILL.md" | Select-Object -First 5
```

**7c.** Confirm TOOLS.md updated:
```powershell
Select-String -Path "C:\Users\PLUTO\openclaw_workspace\TOOLS.md" -Pattern "ccode-dispatch"
```

**7d.** Confirm UFW rule:
```bash
ssh ceg 'sudo ufw status | grep 3003'
```

**7e.** Run one final end-to-end dispatch test:
```bash
ssh ceg 'curl -s -X POST http://100.100.101.1:3003/dispatch -H "Content-Type: application/json" -d "{\"task\": \"What is 2+2? Reply with only the number.\"}" | head -c 1000'
```

Report all results.

## Important Notes

- Do NOT use jq anywhere.
- Do NOT store the API key in any workspace file, skill file, or version-controlled code.
- Do NOT modify AGENTS.md or SOUL.md.
- Do NOT modify openclaw.json.
- Do NOT copy files to OneDrive or any location outside the workspace.
- The dispatch service binds to 100.100.101.1 ONLY — never 0.0.0.0.
- If the ccode auth prerequisite check fails, STOP immediately and report. Do not attempt to build the service without confirmed ccode authentication.
