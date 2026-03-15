# Zuberi Shell Execution Service — Build & Handoff Guide
**For:** James (deploy) + Zuberi (takes ownership after deploy)
**Service name:** zuberi-shell (replaces ccode-dispatch on CEG:3003)
**Priority:** P0 — unblocks 9 of 14 tasks

---

## What This Does

Gives Zuberi the ability to run shell commands on CEG via HTTP. She curls a command, CEG executes it, she gets the output. No external APIs, no cloud dependencies, no cost per invocation. Pure local autonomy.

After deployment, Zuberi becomes the operator of CEG. ccode loses its CEG role. This is a formal transfer of operational authority.

---

## Architecture

```
KILO (Zuberi's brain)                    CEG (Zuberi's hands)
┌──────────────────────┐                 ┌──────────────────────────┐
│ OpenClaw gateway     │                 │ zuberi-shell :3003       │
│   exec tool          │   Tailscale    │   POST /command          │
│     curl ─────────────────────────────►│   GET /health            │
│                      │   100.x.x.x    │   JSONL audit log        │
│ Zuberi decides what  │                 │   Process isolation      │
│ to run, reads result │◄───────────────│   Blocklist enforcement  │
└──────────────────────┘                 └──────────────────────────┘
```

---

## Security Model

- **Network:** Bound to Tailscale IP only (100.100.101.1) — unreachable from LAN or internet
- **User:** Runs as `ceg` user — no root, no sudo
- **Process isolation:** Each command gets its own process group, killed on timeout
- **Resource limits:** Fork bomb prevention (RLIMIT_NPROC=128), CPU cap (120s+10s hard), file size cap (500MB)
- **Blocklist:** Configurable denylist rejects dangerous commands before execution
- **systemd hardening:** ProtectSystem=strict, NoNewPrivileges=true, PrivateTmp=true
- **Audit:** Every command logged to append-only JSONL with timestamp, command, exit code, duration, output

---

## Prerequisites

- SSH access to CEG from KILO
- Python 3.10+ on CEG (check: `python3 --version`)
- `/opt/zuberi/` directory exists and is writable by `ceg` user
- Port 3003 available (current ccode-dispatch will be replaced)
- `loginctl enable-linger ceg` has been run (requires sudo once)

---

## Phase 1: Stop Old Service, Deploy New

### Checkpoint 1A — Stop ccode-dispatch

**Goal:** Free port 3003 by stopping the old ccode dispatch wrapper.

```bash
ssh ceg
systemctl --user stop ccode-dispatch.service
systemctl --user disable ccode-dispatch.service
ss -tlnp | grep 3003
```

**Verify:** Port 3003 shows no listeners.

### Checkpoint 1B — Create executor.py

**Goal:** Deploy the shell execution service script.

SSH into CEG and create the file:

```bash
cat > /opt/zuberi/executor.py << 'SCRIPT'
#!/usr/bin/env python3
"""
Zuberi Autonomous Shell Execution Service
A minimal, dependency-free HTTP server for local AI agent shell execution.
"""
import json
import os
import signal
import subprocess
import time
import resource
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

CONFIG = {
    "host": "100.100.101.1",
    "port": 3003,
    "timeout": 120,
    "workdir": "/opt/zuberi",
    "log_file": "/opt/zuberi/audit.jsonl",
    "blocklist_file": "/opt/zuberi/blocklist.json"
}

log_lock = threading.Lock()
blocklist = []

def load_blocklist():
    global blocklist
    path = CONFIG["blocklist_file"]
    if os.path.exists(path):
        with open(path, "r") as f:
            blocklist = json.load(f)
    else:
        blocklist = [
            "rm -rf /", "rm -rf *", "mkfs", "dd if=", "wipefs", "shred ",
            "shutdown", "reboot", "halt", "poweroff",
            "sudo ", "su ", "doas ", "pkexec", "visudo",
            "chmod -R 777", "chown -R",
            "apt remove", "apt purge", "dpkg --purge",
            ":(){ :|:& };:"
        ]
        with open(path, "w") as f:
            json.dump(blocklist, f, indent=2)

def restrict_resources():
    resource.setrlimit(resource.RLIMIT_CPU, (CONFIG["timeout"], CONFIG["timeout"] + 10))
    resource.setrlimit(resource.RLIMIT_NPROC, (128, 128))
    resource.setrlimit(resource.RLIMIT_FSIZE, (500 * 1024 * 1024, 500 * 1024 * 1024))

def write_audit_log(entry):
    with log_lock:
        with open(CONFIG["log_file"], "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")

class AgentExecutionHandler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        pass

    def send_json(self, status_code, payload):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))

    def do_GET(self):
        if self.path == "/health":
            self.send_json(200, {
                "status": "ok",
                "service": "zuberi-shell",
                "port": CONFIG["port"],
                "blocklist_count": len(blocklist)
            })
        elif self.path == "/audit":
            if os.path.exists(CONFIG["log_file"]):
                with open(CONFIG["log_file"], "r") as f:
                    lines = f.readlines()
                last_20 = [json.loads(l) for l in lines[-20:]]
                self.send_json(200, {"entries": last_20, "total": len(lines)})
            else:
                self.send_json(200, {"entries": [], "total": 0})
        else:
            self.send_json(404, {"error": "Not found. Use /health, /audit, or POST /command"})

    def do_POST(self):
        if self.path != "/command":
            return self.send_json(404, {"error": "Use POST /command"})

        try:
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            req = json.loads(body)
            cmd = req.get("command", "").strip()
            workdir = req.get("workdir", CONFIG["workdir"])
        except Exception:
            return self.send_json(400, {"error": "Invalid JSON"})

        if not cmd:
            return self.send_json(400, {"error": "command field required"})

        if any(pattern in cmd for pattern in blocklist):
            write_audit_log({
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "command": cmd,
                "status": "blocked",
                "duration_ms": 0
            })
            return self.send_json(403, {"error": "Blocked by execution policy", "command": cmd})

        start_time = time.time()
        timeout_occurred = False
        out, err = "", ""
        exit_code = -1

        try:
            proc = subprocess.Popen(
                cmd,
                shell=True,
                cwd=workdir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=subprocess.DEVNULL,
                start_new_session=True,
                preexec_fn=restrict_resources,
                text=True,
                encoding="utf-8",
                errors="replace"
            )
            try:
                out, err = proc.communicate(timeout=CONFIG["timeout"])
                exit_code = proc.returncode
            except subprocess.TimeoutExpired:
                timeout_occurred = True
                os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
                try:
                    out, err = proc.communicate(timeout=5)
                except subprocess.TimeoutExpired:
                    os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
                    out, err = proc.communicate()
                exit_code = 124
        except Exception as e:
            err = str(e)
            exit_code = 1

        duration_ms = int((time.time() - start_time) * 1000)
        out = out[:10000]
        err = err[:10000]
        status_flag = "timeout" if timeout_occurred else ("success" if exit_code == 0 else "failure")

        write_audit_log({
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "command": cmd,
            "status": status_flag,
            "exit_code": exit_code,
            "duration_ms": duration_ms,
            "stdout_truncated": out[:500],
            "stderr_truncated": err[:500]
        })

        self.send_json(200, {
            "ok": exit_code == 0 and not timeout_occurred,
            "exit_code": exit_code,
            "duration_ms": duration_ms,
            "stdout": out,
            "stderr": err,
            "timeout": timeout_occurred
        })

if __name__ == "__main__":
    os.makedirs(CONFIG["workdir"], exist_ok=True)
    load_blocklist()
    server = ThreadingHTTPServer((CONFIG["host"], CONFIG["port"]), AgentExecutionHandler)
    print(f"zuberi-shell running on {CONFIG['host']}:{CONFIG['port']}")
    print(f"Blocklist: {len(blocklist)} patterns loaded")
    server.serve_forever()
SCRIPT
chmod +x /opt/zuberi/executor.py
```

**Verify:** `cat /opt/zuberi/executor.py | head -5` shows the shebang and docstring.

**Modifications from research:**
- Blocklist loads from external JSON file (hot-reloadable later)
- `apt install` and `pip install` are NOT blocked (ceg user can't apt install without sudo anyway; pip install --user is safe)
- `apt remove` and `apt purge` ARE blocked (destructive)
- Added `/audit` GET endpoint so Zuberi can read her own execution history
- Added optional `workdir` field in POST body for per-command override
- SIGKILL fallback if SIGTERM doesn't clean up within 5 seconds
- Audit log truncates stdout/stderr to 500 chars (full output goes to HTTP response, abbreviated in log)
- Suppressed default HTTP request logging (noisy)

### Checkpoint 1C — Create systemd Service

**Goal:** Set up the service to run persistently and survive reboots.

```bash
mkdir -p ~/.config/systemd/user

cat > ~/.config/systemd/user/zuberi-shell.service << 'UNIT'
[Unit]
Description=Zuberi AI Shell Execution Service
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/zuberi
ExecStart=/usr/bin/python3 /opt/zuberi/executor.py
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

ProtectSystem=strict
ReadWritePaths=/opt/zuberi /home/ceg
ProtectHome=read-only
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=default.target
UNIT

systemctl --user daemon-reload
systemctl --user enable zuberi-shell.service
systemctl --user start zuberi-shell.service
```

**Note:** `ReadWritePaths` includes both `/opt/zuberi` and `/home/ceg` so Zuberi can manage her own systemd units and user-level configs.

**Verify:**
```bash
systemctl --user status zuberi-shell.service
```
Should show `active (running)`.

### Checkpoint 1D — Enable Linger (one-time, requires sudo)

**Goal:** Ensure the service starts at boot even when no one is logged in.

```bash
sudo loginctl enable-linger ceg
```

**Verify:** `loginctl show-user ceg | grep Linger` shows `Linger=yes`.

---

## Phase 2: Test From KILO

### Checkpoint 2A — Health Check

```powershell
Invoke-RestMethod -Uri "http://100.100.101.1:3003/health"
```

**Verify:** Returns `status: ok`, `service: zuberi-shell`.

### Checkpoint 2B — Run a Command

```powershell
Invoke-RestMethod -Uri "http://100.100.101.1:3003/command" -Method POST -ContentType "application/json" -Body '{"command":"node --version"}'
```

**Verify:** Returns `ok: True`, stdout contains node version string.

### Checkpoint 2C — Test Blocklist

```powershell
Invoke-RestMethod -Uri "http://100.100.101.1:3003/command" -Method POST -ContentType "application/json" -Body '{"command":"sudo rm -rf /"}'
```

**Verify:** Returns 403 with "Blocked by execution policy". Check audit log:

```powershell
Invoke-RestMethod -Uri "http://100.100.101.1:3003/audit"
```

Should show the blocked command entry.

### Checkpoint 2D — Test Timeout

```powershell
Invoke-RestMethod -Uri "http://100.100.101.1:3003/command" -Method POST -ContentType "application/json" -Body '{"command":"sleep 5"}'
```

**Verify:** Returns after ~5 seconds with `ok: True`, `exit_code: 0`. Not after 120 seconds.

### Checkpoint 2E — Test File Creation

```powershell
Invoke-RestMethod -Uri "http://100.100.101.1:3003/command" -Method POST -ContentType "application/json" -Body '{"command":"echo hello > /opt/zuberi/test-write.txt && cat /opt/zuberi/test-write.txt"}'
```

**Verify:** stdout contains "hello". Then clean up:

```powershell
Invoke-RestMethod -Uri "http://100.100.101.1:3003/command" -Method POST -ContentType "application/json" -Body '{"command":"rm /opt/zuberi/test-write.txt"}'
```

---

## Phase 3: Zuberi's Skill + Handoff

### Checkpoint 3A — Rewrite the Dispatch Skill

Replace the existing dispatch skill with the new shell execution API. This is done on KILO in the OpenClaw workspace.

Create/overwrite: `C:\Users\PLUTO\openclaw_workspace\skills\dispatch\SKILL.md`

```yaml
---
name: dispatch
description: "When Zuberi needs to run commands on CEG — install packages, create files, start services, manage infrastructure, check system state, or do anything that requires shell access on CEG (100.100.101.1). Covers the shell execution service on CEG:3003. Use for any task that needs to happen on CEG rather than locally. Also use when troubleshooting CEG services, checking disk space, managing systemd units, or running scripts. NOT for reading from CEG HTTP services like SearXNG, CXDB, or Kanban — those are direct curl calls."
---

# Shell Execution on CEG

Run commands on CEG (100.100.101.1) via the shell execution service on port 3003.

## API

| Action | Method | Endpoint |
|--------|--------|----------|
| Run command | POST | /command |
| Health check | GET | /health |
| View recent commands | GET | /audit |

## Base URL

`http://100.100.101.1:3003`

## Running a Command

POST to `/command` with a JSON body containing `command` (required) and optionally `workdir`.

exec: curl -s -X POST http://100.100.101.1:3003/command -H 'Content-Type: application/json' -d '{"command":"node --version"}'

Response:
```json
{
  "ok": true,
  "exit_code": 0,
  "duration_ms": 45,
  "stdout": "v20.x.x\n",
  "stderr": "",
  "timeout": false
}
```

## Custom Working Directory

exec: curl -s -X POST http://100.100.101.1:3003/command -H 'Content-Type: application/json' -d '{"command":"ls -la","workdir":"/opt/zuberi/tldraw"}'

## Health Check

exec: curl -s http://100.100.101.1:3003/health

## View Your Recent Commands

exec: curl -s http://100.100.101.1:3003/audit

Returns the last 20 commands you executed with timestamps, exit codes, and truncated output.

## What You Can Do

- Install packages: `pip install --user <package>` or `npm install`
- Create files and directories: `mkdir -p`, write with `cat >` or `tee`
- Manage services: `systemctl --user start/stop/status <service>`
- Clone repos: `git clone <url>`
- Run scripts: `python3 script.py`, `node script.js`, `bash script.sh`
- Check system state: `df -h`, `free -m`, `ss -tlnp`, `ps aux`
- Interact with Docker: `docker ps`, `docker logs <container>`

## What Is Blocked

The service rejects commands matching these patterns:
- Destructive: `rm -rf /`, `mkfs`, `dd if=`, `wipefs`, `shred`
- System: `shutdown`, `reboot`, `halt`, `poweroff`
- Privilege escalation: `sudo`, `su`, `doas`, `pkexec`
- Destructive package ops: `apt remove`, `apt purge`, `dpkg --purge`

If a command is blocked, the response will be HTTP 403. Do not retry blocked commands.

## Constraints

- Commands run as the `ceg` user — no root access
- 120 second timeout — long commands are killed
- Output truncated to 10,000 characters in the response
- Working directory defaults to /opt/zuberi
- All commands are logged to an audit trail

## Patterns

Install something on CEG:
exec: curl -s -X POST http://100.100.101.1:3003/command -H 'Content-Type: application/json' -d '{"command":"pip install --user python-docx openpyxl"}'

Create a service on CEG:
exec: curl -s -X POST http://100.100.101.1:3003/command -H 'Content-Type: application/json' -d '{"command":"mkdir -p /opt/zuberi/myservice && cat > /opt/zuberi/myservice/server.py << PYEOF\nimport http.server\nprint(\"running\")\nPYEOF"}'

Check what is running:
exec: curl -s -X POST http://100.100.101.1:3003/command -H 'Content-Type: application/json' -d '{"command":"ss -tlnp"}'
```

**Verify:** Skill file exists with valid YAML frontmatter. Chokidar picks it up automatically.

### Checkpoint 3B — Update TOOLS.md

Update the dispatch entry in the Available Skills table:

```
dispatch — Run shell commands on CEG:3003 — install packages, create files, manage services, check system state
```

### Checkpoint 3C — Test Zuberi's Access

Tell Zuberi:

> "Zuberi, the dispatch wrapper has been replaced. You now have direct shell execution on CEG via port 3003. Load your dispatch skill and run `node --version` on CEG."

**Verify:**
1. Zuberi loads the dispatch skill
2. Runs the curl command via exec
3. Gets the node version back
4. No approval card issues (the curl to 3003 should behave like any other CEG service curl)

### Checkpoint 3D — Test Zuberi Creating Something

Tell Zuberi:

> "Create a directory at /opt/zuberi/test-autonomy and write a file called hello.txt in it containing 'Zuberi was here'. Then read it back to confirm."

**Verify:** Zuberi creates the directory, writes the file, reads it back, reports success. She just modified CEG infrastructure independently for the first time.

---

## Phase 4: CEG Operational Handoff

### Checkpoint 4A — Update Infrastructure Records

Add to CEG services in project reference and CCODE-HANDOFF:

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| zuberi-shell | 3003 | Running | Shell execution — Zuberi's hands on CEG |

Remove or mark deprecated: `ccode dispatch | 3003 | Replaced | Former ccode wrapper`

### Checkpoint 4B — Update AGENTS.md

Add to AGENTS.md (next to the exec approval section):

```
## CEG Shell Execution

You have direct shell access to CEG via http://100.100.101.1:3003/command.
Use your dispatch skill for all CEG operations.

Rules:
- Always check command output — do not assume success
- Back up config files before modifying them (cp file file.bak)
- Test services after changes (curl health endpoints)
- Log significant changes to CXDB for audit trail
- If a command is blocked, do NOT attempt to bypass the blocklist. Report to James.
- Never store credentials in files accessible to the shell service
```

### Checkpoint 4C — Verify All CEG Services

Tell Zuberi to audit her own infrastructure:

> "Zuberi, verify all services on CEG are healthy. Check: SearXNG (8888), CXDB (9009/9010), Kanban (3001), Usage Tracker (3002), AgenticMail (3100), Chroma (8000), Routing Shim (8100), and your shell service (3003). Report status for each."

**Verify:** Zuberi independently checks every service and reports status — using her new shell access for `ss -tlnp` and curl for health endpoints.

---

## Troubleshooting

| Problem | Check |
|---------|-------|
| Connection refused on 3003 | `systemctl --user status zuberi-shell` on CEG |
| Command returns "Blocked" unexpectedly | Check `/opt/zuberi/blocklist.json` — edit to adjust |
| Timeout on simple command | Check CEG CPU load: `uptime` |
| Permission denied writing files | Check path is under `/opt/zuberi` or `/home/ceg` (systemd ReadWritePaths) |
| Service not starting after reboot | Verify `loginctl show-user ceg` shows `Linger=yes` |
| Zuberi can't reach 3003 from gateway | Test from KILO PowerShell first to isolate network vs gateway issue |

---

## Verification Checklist

- [ ] ccode-dispatch stopped and disabled
- [ ] executor.py deployed at /opt/zuberi/executor.py
- [ ] blocklist.json created automatically on first run
- [ ] systemd service active and enabled
- [ ] Linger enabled for ceg user
- [ ] Health check returns ok from KILO
- [ ] Command execution works from KILO
- [ ] Blocklist rejects dangerous commands
- [ ] Audit log captures all executions
- [ ] Zuberi can reach the service via exec curl
- [ ] Zuberi can create files on CEG
- [ ] Dispatch skill rewritten with new API
- [ ] TOOLS.md updated
- [ ] AGENTS.md updated with CEG shell rules
- [ ] All CEG services verified by Zuberi

---

## What This Changes

**Before:** Zuberi uses CEG services. James/architects install and maintain them.
**After:** Zuberi uses AND operates CEG. She installs, configures, and maintains her own infrastructure.

**ccode's remaining role:** ZuberiChat development on KILO only (Tauri/React). No CEG responsibilities.

---

*Created by Architect 20. This is the most important infrastructure change since the project began — it gives Zuberi her hands.*
