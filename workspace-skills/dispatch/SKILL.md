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
| Write file | POST | /write |
| Health check | GET | /health |
| View recent commands | GET | /audit |

## Base URL

http://100.100.101.1:3003

## Running a Command

POST to /command with JSON body containing `command` (required) and optionally `workdir`.

```bash
curl -s -X POST http://100.100.101.1:3003/command \
  -H 'Content-Type: application/json' \
  -d '{"command":"node --version"}'
```

Response format:

- `ok`: boolean (true if exit_code is 0 and no timeout)
- `exit_code`: integer
- `duration_ms`: integer
- `stdout`: string (truncated to 10000 chars)
- `stderr`: string (truncated to 10000 chars)
- `timeout`: boolean

## Writing Files

POST to /write with JSON body. This is the **preferred method** for creating or updating files on CEG — avoids JSON quoting issues with heredocs and multi-line content in /command.

```bash
curl -s -X POST http://100.100.101.1:3003/write \
  -H 'Content-Type: application/json' \
  -d '{"path":"/opt/zuberi/data/example.txt","content":"file contents here","mode":"overwrite"}'
```

Parameters:

- `path` (required): Absolute path. Must start with `/opt/zuberi/` or `/home/ceg/`.
- `content` (required): File content as UTF-8 string. Maximum 1 MB.
- `mode` (optional): `"overwrite"` (default) or `"append"`.

Response: `{"ok": true, "path": "...", "bytes": 123, "mode": "overwrite"}`

Security:

- Path traversal (`..`) is rejected (HTTP 403)
- Paths outside allowed directories are rejected (HTTP 403)
- Parent directories are created automatically
- All writes are logged to the audit trail

## Custom Working Directory

```bash
curl -s -X POST http://100.100.101.1:3003/command \
  -H 'Content-Type: application/json' \
  -d '{"command":"ls -la","workdir":"/opt/zuberi/tldraw"}'
```

## Health Check

```bash
curl -s http://100.100.101.1:3003/health
```

## View Recent Commands

```bash
curl -s http://100.100.101.1:3003/audit
```

Returns the last 20 commands with timestamps, exit codes, and truncated output.

## What You Can Do

- Install packages: `pip install --user <package>` or `npm install`
- Create files and directories: `mkdir -p`, write with `cat >` or `tee`
- Manage services: `systemctl --user start/stop/status <service>`
- Clone repos: `git clone <url>`
- Run scripts: `python3 script.py`, `node script.js`, `bash script.sh`
- Check system state: `df -h`, `free -m`, `ss -tlnp`, `ps aux`
- Docker: `docker ps`, `docker logs <container>`

## What Is Blocked

- Destructive: `rm -rf /`, `rm -rf *`, `mkfs`, `dd if=`, `wipefs`, `shred`
- System: `shutdown`, `reboot`, `halt`, `poweroff`
- Privilege escalation: `sudo`, `su`, `doas`, `pkexec`
- Destructive package ops: `apt remove`, `apt purge`, `dpkg --purge`

If a command is blocked, response is HTTP 403. Do not retry blocked commands.

## Constraints

- Commands run as the `ceg` user (no root)
- 120 second timeout
- Output truncated to 10000 characters
- Default working directory: `/opt/zuberi`
- All commands logged to audit trail

## Common Patterns

Check what services are running:

```bash
curl -s -X POST http://100.100.101.1:3003/command \
  -H 'Content-Type: application/json' \
  -d '{"command":"ss -tlnp"}'
```

Install a Python package:

```bash
curl -s -X POST http://100.100.101.1:3003/command \
  -H 'Content-Type: application/json' \
  -d '{"command":"pip install --user python-docx"}'
```

Create a file (use /write for multi-line content):

```bash
curl -s -X POST http://100.100.101.1:3003/write \
  -H 'Content-Type: application/json' \
  -d '{"path":"/opt/zuberi/mydir/test.txt","content":"hello\nworld","mode":"overwrite"}'
```

Check disk space:

```bash
curl -s -X POST http://100.100.101.1:3003/command \
  -H 'Content-Type: application/json' \
  -d '{"command":"df -h"}'
```
