---
name: infrastructure
description: Hardware inventory, network topology, Docker services, port assignments, and node management for Zuberi's infrastructure. Use when asking about nodes, services, ports, volumes, Tailscale, or system architecture.
---

# INFRASTRUCTURE.md — Zuberi
# Operator: James | Wahwearro Holdings, LLC
# Version: 0.8.0 | 2026-03-02
#
# Single source of truth for Zuberi's infrastructure.
# When hardware changes, services are added, or ports shift — update here first.
# AGENTS.md, MEMORY.md, and TOOLS.md reference this file's concepts
# but do not duplicate the detail — keep it here.
#
# UPDATE THIS FILE when:
#   - A new node joins the Tailscale tailnet
#   - A new Docker service is added
#   - A port assignment changes
#   - A new volume mount is added to docker-compose.yml
#   - A node goes offline permanently
#   - A new tool is added to CEG's toolbox

---

## Node Inventory

### KILO — Primary Workstation (brain + interface)
```
Role:         LLM inference, framework runtime, chatbox, active dev
OS:           Windows 11 + WSL2 + Docker Desktop
CPU:          [KILO spec]
GPU:          RTX 5070 Ti 16GB + Intel UHD 770
RAM:          64GB
Storage:      C:\ (system + workspace) | E:\ (personal, except E:\ollama\models for Ollama)
Network:      Local LAN + Tailscale
Tailscale:    100.127.23.52 (jamesmwaweru@gmail.com)
ccode:        v2.1.59 — James's personal coding tool (NOT Zuberi's sub-agent)
Status:       ✅ Running
```

### CEG — Zuberi's Toolbox (M701q #1)
```
Role:         Zuberi's toolbox — storage, compute, sub-agents
              NOT defined by any single tool. Tools added as Zuberi identifies needs.
Hardware:     Lenovo M701q
OS:           Ubuntu Server 24.04.4 LTS, kernel 6.8.0-101-generic
RAM:          15GB (14GB free at idle)
Storage:      512GB SSD (9% used)
Network:      WiFi (EDUP EP-AX1672, mt7921au) + Tailscale
WiFi:         wlx90de80152e3f — auto-connects via wpa_supplicant@ + dhcpcd@ systemd services
              SSID: KeigeWaweru | Local IP: 192.168.1.121 (DHCP)
              NOTE: netplan does NOT manage USB WiFi on Ubuntu Server
Tailscale:    100.100.101.1 (authenticated, auto-starts on boot)
SSH:          Ed25519 key auth from KILO, service enabled on boot
              ListenAddress 100.100.101.1 (Tailscale only — LAN SSH refused)
              ssh.socket override: /etc/systemd/system/ssh.socket.d/override.conf
Firewall:     UFW enabled, default deny incoming, allow all on tailscale0
Docker:       29.2.1 (docker-ce + compose plugin), DNS fix applied
              /etc/docker/daemon.json: {"dns": ["8.8.8.8", "1.1.1.1"]}
              Images pinned to sha256 digests (no :latest tags)
n8n auth:     Owner account created (james@zuberi.local), 401 on unauthed
Watchdog:     /opt/zuberi/scripts/network-watchdog.sh (systemd timer, every 60s)
              Auto-recovers WiFi drops (wpa_supplicant → dhcpcd → tailscaled chain)
Status:       ✅ Running — boot resilient (WiFi, Tailscale, SSH, Docker all auto-start)
```

### Kasm Desktop — Collaborative Desktop (Docker on KILO)
```
Role:         Shared visual workspace — James + Zuberi both see it
              Sub-agent Kanban board surface
              ActivityWatcher desktop monitoring
Runtime:      Docker container on KILO
Image:        kasmweb/ubuntu-jammy-desktop
Access:       https://localhost:6901 (browser-based, no RDP client needed)
Status:       ⏳ Phase 2 — not yet deployed
Depends on:   ActivityWatcher container
```

---

## Ollama Model Inventory

All models stored at `E:\ollama\models` (~28GB total).
OLLAMA_MODELS env var set at user level. Ollama runs as user process, not service.

```
Model               Size    Discipline              GPU Load    Notes
─────────────────────────────────────────────────────────────────────────
gpt-oss:20b         13GB    General expertise        100% VRAM   Primary. 131K context.
qwen2.5-coder:14b   9.0GB   Software engineering     100% VRAM   Code generation. 131K context.
qwen3-vl:8b         6.1GB   Visual analysis          100% VRAM   Image input, OCR. 131K context.
```

**VRAM constraint:** RTX 5070 Ti has 16GB. One model at a time for best performance.
Zuberi can load/unload models via Ollama skill. Unload for video/DRM/gaming.

---

## Docker Services (KILO)

### Current
```
Container                       Image                   Port          Status
──────────────────────────────────────────────────────────────────────────────
openclaw-openclaw-gateway-1     openclaw:local          18789         ✅ Running (v2026.2.26)
ollama                          (native install)        11434         ✅ Running
```

Container name `openclaw-openclaw-gateway-1` is Docker Compose auto-generated.
Alias `container_name: openclaw` planned for docker-compose.yml.

### ZuberiChat Dev (Tauri + Vite)
```
Test suite:    Vitest + React Testing Library (155 smoke tests)
Run tests:     cd C:\Users\PLUTO\github\Repo\ZuberiChat && pnpm test
Dev server:    pnpm tauri dev (Vite on :3000 + Tauri window)
Kanban:        Separate Express server on port 3001
Kanban start:  cd apps/veritas-kanban && pnpm dev
```

### Phase 2 Additions (Kasm + ActivityWatcher)
```
Container       Image                           Port    Status
────────────────────────────────────────────────────────────────
kasm-desktop    kasmweb/ubuntu-jammy-desktop    6901    ⏳ Pending
activitywatcher activitywatch/activitywatch     5600    ⏳ Pending
```

### Phase 3 Services (CEG toolbox) — LIVE
```
Service         Host    Port    Access              Status
──────────────────────────────────────────────────────────────
searxng         CEG     8888    Tailscale only      ✅ Running (JSON API enabled, limiter off)
n8n             CEG     5678    Tailscale only      ✅ Running (API key auth, skill wired)
cxdb            CEG     9009    Binary protocol     ✅ Running (built from source, 244MB)
cxdb (HTTP+UI)  CEG     9010    Tailscale only      ✅ Running (REST API + React UI)
kanban          CEG     3001    Tailscale only      ✅ Running (Express 5, JWT+API key auth)
ccode (CLI)     CEG     —       SSH dispatch        ⏳ Pending (headless auth TBD)
```

Docker compose: /opt/zuberi/docker/docker-compose.yml
Data volumes: /opt/zuberi/docker/{searxng,n8n,cxdb}/
All services: restart=always, bound to 100.100.101.1 (Tailscale only)
CXDB source: /opt/zuberi/cxdb/ (cloned from github.com/strongdm/cxdb)
CXDB types: Bundle zuberi-2026-02-28 (Note, Decision, Preference, Task)

Integration status:
- SearXNG: Running, skill deployed, end-to-end test from Zuberi pending
- n8n: Running, API key auth, skill deployed, wired to Zuberi via REST API
- Kanban: Running on CEG:3001, CLAWDBOT_GATEWAY set to KILO OpenClaw
- CXDB: Running, skill deployed, type descriptors registered, end-to-end test pending
- Skills: searxng/, cxdb/, ollama/ deployed to workspace

### Phase 3a External Services
```
Service         Type          Notes                           Status
────────────────────────────────────────────────────────────────────────
AgentMail       Cloud API     Zuberi's email identity         ⏳ Pending
                              Free tier: 3 inboxes, 3K/mo
                              MCP: agentmail-mcp server
                              API key: OpenClaw secrets only
```

---

## OpenClaw Configuration Summary

```
Config: C:\Users\PLUTO\openclaw_config\openclaw.json
Version: v2026.2.26

Key settings:
  model.primary:        ollama/gpt-oss:20b
  model.registered:     gpt-oss:20b, qwen2.5-coder:14b, qwen3-vl:8b
  reasoning:            false (Qwen3 thinks natively; API param causes 400)
  sandbox.mode:         non-main (webchat runs on gateway, others sandboxed)
  sandbox.scope:        agent
  sandbox.network:      none
  elevated.enabled:     true (webchat: read, exec, write)
  memorySearch.provider: local (all-MiniLM-L6-v2)
  memorySearch.hybrid:  enabled (vector 0.7, text 0.3, 4x candidates)
  memorySearch.cache:   enabled (50K entries)
  memorySearch.query:   maxResults 10, minScore 0.25
  memoryFlush:          enabled
  sessionMemory:        enabled
  compaction:           safeguard mode
```

---

## Port Inventory

```
Port    Service             Host    Notes
──────────────────────────────────────────────────────────────
18789   OpenClaw framework  KILO    Loopback only (localhost)
11434   Ollama              KILO    Native install, localhost
6901    Kasm desktop        KILO    Loopback only (Phase 2)
5600    ActivityWatcher     KILO    Loopback only (Phase 2)
9009    CXDB MCP            CEG     Tailscale only (Phase 3)
9010    CXDB UI             CEG     Tailscale only (Phase 3)
8888    SearXNG             CEG     Tailscale only (Phase 3)
5678    n8n                 CEG     Tailscale only (Phase 3)
3001    Veritas Kanban       CEG     Tailscale only (Phase 3)
22      SSH                 CEG     Tailscale only (Phase 3)
```

---

## Volume Mount Map

### Current
```
Host path (KILO)                        Container path                  Service
────────────────────────────────────────────────────────────────────────────────
C:\Users\PLUTO\openclaw_config          /home/node/.openclaw            openclaw
C:\Users\PLUTO\openclaw_workspace       /home/node/.openclaw/workspace  openclaw
```

### Phase 2 Additions
```
Host path (KILO)                        Container path    Service
────────────────────────────────────────────────────────────────────
C:\Users\PLUTO\openclaw_workspace       /workspace        kasm-desktop
C:\Users\PLUTO\github\Repo              /repos            kasm-desktop
```

### Phase 3 Additions (CEG via Tailscale)
```
CEG path                                Container path    Notes
────────────────────────────────────────────────────────────────────
CEG:/opt/zuberi/projects                /projects         Large files, repos, builds
CEG:/opt/zuberi/shared                  /shared           Zuberi + Kasm shared surface
```

**Mount rules:**
- E:\ on KILO is never mounted — personal drive (exception: E:\ollama\models for Ollama)
- CEG mounts only available when Tailscale is connected
- New mounts require docker-compose.yml update + container restart
- For heavy builds: prefer CEG-ccode dispatch via SSH over Tailscale mounts (lower latency)

---

## Workspace Directory Structure (KILO)

```
C:\Users\PLUTO\openclaw_workspace\         ~50MB total (stays lean)
├── IDENTITY.md                         OpenClaw identity (Zuberi self-authored)
├── USER.md                             About James (Zuberi self-authored)
├── AGENTS.md                           Behavior rules
├── SOUL.md                             Identity and philosophy
├── MEMORY.md                           Curated long-term memory
├── TOOLS.md                            Tool guidance
├── skills\
│   ├── searxng\SKILL.md                SearXNG web search skill
│   ├── cxdb\SKILL.md                   CXDB memory skill
│   ├── ollama\SKILL.md                 Ollama model management skill
│   ├── n8n\SKILL.md                    n8n workflow automation skill
│   ├── model-router\SKILL.md           Autonomous discipline selection
│   ├── horizon\SKILL.md               Deferred ideas and future plans
│   ├── infrastructure\SKILL.md        This file
│   ├── heartbeat\SKILL.md             Proactive check schedule (disabled)
│   ├── usage-tracking\SKILL.md        API usage tracking (CEG:3002)
│   └── dispatch\SKILL.md              CEG-ccode sub-agent dispatch
├── memory\                             Daily session notes
│   └── YYYY-MM-DD.md                   One file per day
└── working\                            Scratch space — clearable
    ├── sub-agents\                     Kanban tracking files
    │   └── YYYY-MM-DD-kanban.md
    └── <project-name>\                 Per-project working files
```

---

## CEG Directory Structure

```
CEG:/opt/zuberi/
├── cxdb/                   CXDB data store — managed by CXDB container
│   └── data/               Blob CAS + Turn DAG files
├── data/                   Service data volumes
│   ├── n8n/                n8n workflow data
│   ├── kanban/             Veritas-Kanban persistent data
│   └── backups/            Automated backup storage (planned)
├── docker/                 Docker compose + service configs
│   ├── docker-compose.yml
│   ├── searxng/            SearXNG config (settings.yml)
│   ├── n8n/                n8n data
│   └── cxdb/               CXDB data volumes
├── projects/               Project file storage — ccode builds here
│   └── <project-name>/
│       ├── repos/          Source repositories
│       ├── tools/          Project toolchain
│       └── build/          Build output and artifacts
├── reference/              Study material (NOT operational code)
│   ├── ruflo/              Agent orchestration patterns
│   ├── automaton/          Autonomous agent patterns
│   └── CATALOG.md          What's useful and how it maps to Zuberi
└── shared/                 Files both Zuberi and Kasm desktop access
    ├── working/            Active collaboration files
    └── exports/            Files ready for James to review
```

---

## Tailscale Network Map

```
Account:      jamesmwaweru@gmail.com (Google SSO)

Node          Tailscale IP          Status
──────────────────────────────────────────────────────
KILO          100.127.23.52         ✅ Active
CEG           100.100.101.1         ✅ Active (boot-resilient)
```

All inter-node communication goes through Tailscale.
Never expose node services to the public internet.
CEG services (CXDB, SearXNG, n8n, SSH) are Tailscale-only — no public ports.

---

## Node Addition Procedure

When a new M701q or other node is added to the infrastructure:

```
1. Install Ubuntu Server 24.04
2. Run node-online.sh equivalent (based on ceg-online.sh pattern)
   - Configure WiFi via wpa_supplicant@ + dhcpcd@ (NOT netplan for USB WiFi)
   - Install openssh-server
   - Install Tailscale, join tailnet
   - Generate SSH keypair for Claude Code access
3. Note the Tailscale IP — report to James
4. Update this file:
   - Add node to Node Inventory
   - Add services to Docker Services table
   - Add ports to Port Inventory
   - Add mounts to Volume Mount Map
5. Update MEMORY.md Infrastructure Baseline
6. Update docker-compose.yml on KILO with new mounts
7. Restart openclaw container to pick up new mounts
```

---

## Appendix: Version History

| Version | Date | Change |
|---------|------|--------|
| 0.1.0 | 2026-02-24 | Initial — Phase 1 baseline, Phases 2+3 planned |
| 0.2.0 | 2026-02-24 | n8n added (CEG:5678), AgentMail added as Phase 3a external service |
| 0.3.0 | 2026-02-25 | Workspace path corrected, Ollama native install noted, volume mounts updated |
| 0.4.0 | 2026-02-26 | CEG reframed as toolbox, ccode CLI + SearXNG added to Phase 3, mount rules updated |
| 0.5.0 | 2026-02-27 | CEG fully online, Phase 3 services LIVE, OpenClaw skill integration path discovered |
| 0.6.0 | 2026-02-28 | Batch update: OpenClaw v2026.2.26, 4 Ollama models documented with VRAM notes, qwen3:14b-fast as primary, sandbox mode non-main, elevated exec documented, hybrid memory search + cache, OpenClaw config summary section added, 3 workspace skills (searxng/cxdb/ollama), IDENTITY.md + USER.md in workspace structure, container name documented, CEG reference repos directory added, Ollama model inventory section added. |
| 0.7.0 | 2026-03-01 | CEG security hardening: UFW enabled (Tailscale-only), n8n owner auth, Docker images pinned to sha256 digests, SSH locked to Tailscale IP (ssh.socket override). Network watchdog deployed (systemd timer, 60s interval, auto-recovery chain). ZuberiChat: Vitest smoke test suite deployed (12 tests). Kanban backend documented (port 3001, separate Express server). |
| 0.8.0 | 2026-03-02 | n8n skill wired (API key auth, REST API integration). Veritas-Kanban added to service map (CEG:3001). GPU updated to RTX 5070 Ti 16GB. Port inventory and integration status updated. |

## Known Issues

- netplan does NOT manage USB WiFi on Ubuntu Server. Use systemd wpa_supplicant@ + dhcpcd@.
- Docker DNS inside containers fails with systemd-resolved. Fix: `{"dns":["8.8.8.8","1.1.1.1"]}` in `/etc/docker/daemon.json`.
- systemd user services don't source .bashrc. Add `Environment=` directives explicitly in the unit file.

## Whisper CPU Service (Session 23)
- Container name: whisper-ceg
- Health check: GET http://100.100.101.1:8200/ → HTTP 200 when healthy
- Transcription: POST http://100.100.101.1:8200/transcribe (multipart form-data, key: file)
- Port: 8200 (Chroma uses 8000, RTL-058 routing shim reserved on 8100)
- Deployment: Docker on CEG, Flask + whisperx, CPU-only
- Image: whisper-ceg:latest

## Squid Proxy (Updated Session 23)
- YouTube domains added to whitelist: youtube.com, www.youtube.com, m.youtube.com, youtu.be, googlevideo.com, .googlevideo.com, ytimg.com, .ytimg.com, i.ytimg.com, yt3.ggpht.com
- Whitelist file: /etc/squid/whitelist_domains.txt
- Config: /etc/squid/squid.conf
- Reload after changes: sudo systemctl reload squid

---
# END INFRASTRUCTURE.md
