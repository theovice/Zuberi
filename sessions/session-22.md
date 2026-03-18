# Session 22 — Architect 22

**Date:** 2026-03-17 to 2026-03-18
**ZuberiChat:** v1.0.35 → v1.0.38 (3 versions shipped)
**Commits:** ea8ede4, 8a9b509, 92fcfdb, a86d07a, afec570, b28f8fd, 5ed82e8, ed67511, 20adbb3

## Completed

### ZuberiChat
- v1.0.36: CSP connect-src fix (Sync API), thinking indicator stall detection (4s threshold)
- v1.0.37: Auto-launch Sync API from Rust backend (ensure_sync_api command)
- v1.0.38: Sidebar history race condition fix, non-chat role filtering

### OpenClaw Configuration
- **tools.allow CRITICAL FIX**: Global whitelist `["read","write","exec"]` was blocking 27/30 tools. Removed entirely. Web search/fetch enabled.
- timeoutSeconds confirmed at 1800s
- Session tool snapshot lesson: config changes require /reset or new session

### CEG Hardening
- Shell service converted from systemd user service to system service at /etc/systemd/system/zuberi-shell.service
- Passwordless sudo for ceg user via /etc/sudoers.d/ceg
- Squid SNI proxy installed and configured: CONNECT-only on 443, domain whitelist at /etc/squid/whitelist_domains.txt
- iptables rules restricting outbound 443 to Squid proxy user only (IPv4 working, IPv6 pending)
- UFW replaced by iptables-persistent (UFW removed during iptables-persistent install)
- apt configured to use Squid: /etc/apt/apt.conf.d/99proxy
- Docker on CEG configured to use Squid: /etc/systemd/system/docker.service.d/http-proxy.conf
- Squid whitelist domains: Ubuntu mirrors, PyPI, Docker registry, GitHub, Google (Gmail), Tailscale, Anthropic API, search engines, nodesource, Docker, Tailscale repos, download.pytorch.org, Cloudflare R2 storage

### Browser Automation (RTL-064)
- kasmweb/chrome Docker sidecar with network_mode: "service:openclaw-gateway" (shared network namespace)
- CDP via localhost:9222 from gateway container — no Host header rejection
- noVNC at localhost:6901 (user: kasm_user, pw: zuberi2026)
- Browser skill updated, Zuberi verified navigating websites
- Chrome shortcut on desktop replaced with Docker sidecar approach

### AGENTS.md Updates
- Skill install gate: "Installing, removing, or modifying any OpenClaw skill or plugin" added to MUST CONFIRM
- WORK STYLE: Proactive autonomy — flow through read-only steps, pause only at decision points, self-recover before reporting failure
- MEMORY RECALL: Check memory_search, lcm_grep, cxdb before saying "I don't remember"
- EXECUTION DISCIPLINE: Plan before building, use sub-agents, fix problems autonomously, verify before done, demand quality, simplicity first

### Skills Created/Updated
- skills/research/SKILL.md — 6-phase structured research methodology
- skills/corrections/corrections.md — self-improving corrections log
- infrastructure/SKILL.md v0.8.0→v1.0.0 (7 missing CEG services)
- stack-guidance: OpenClaw version updated
- capability-awareness: step 4 updated
- browser skill: updated for Docker sidecar
- n8n skill: hooks documentation added (not yet enabled)
- TOOLS.md: research skill registered

### Workspace Organization
- docs/ directory structure established: research/, Mission-Ganesha/, Mission-Ganesha/sub-projects/
- Full workspace sync to ArchitectZuberi repo: workspace-skills/, workspace-root/, workspace-docs/

### Zuberi Behavioral
- Memory recall confirmed working (LCM + memory_search)
- Persistent exec vs dispatch confusion — Zuberi repeatedly uses dispatch (not loaded) instead of exec
- Persistent container vs CEG confusion — runs commands in gateway container instead of through shell service at :3003
- Revenue research initiated — Phase 2 search queries completed

## In Progress

### Whisper CPU Service on CEG
- Directory created at /opt/zuberi/whisper/
- Dockerfile written (needs PyTorch version fix: torch==2.5.1 not torch==2.5.1+cpu)
- server.py NOT yet written
- Container NOT yet built
- Chrome extension files at docs/Research/TabAudioRecorder/ — not yet loaded into Kasm browser
- Extension manifest needs host_permissions for http://100.100.101.1:8000/*
- Extension background.js needs POST URL changed to http://100.100.101.1:8000/transcribe

### Mission Ganesha Revenue Research
- Phase 1 (scope) complete
- Phase 2 (search) complete — 5 queries executed
- Phase 3 (fetch + synthesize) in progress
- Output: docs/research/revenue-streams.md

## Pending

### IPv6 iptables Hardening
- IPv4 rules working (proxy user only on 443)
- IPv6 bypasses the restriction — direct curl over IPv6 succeeds
- Deep research submitted, results not yet applied

### n8n Workflow Integration
- Bidirectional design documented
- Zuberi → n8n: already works via n8n skill + API
- n8n → Zuberi: OpenClaw hooks endpoint designed but NOT enabled in openclaw.json
- Scheduled research workflow designed but not built

### Hardware Change
- James purchased RTX 3090 (24GB), arriving in ~1 week
- Returning RTX 5070 Ti
- Will pair with existing RTX 3060 (8GB) from storage
- Total: 32GB VRAM (24+8), both Ampere architecture
- 3090 = primary inference, 3060 = display + overflow

## Critical Lessons This Session

### S22-L1: tools.allow is a global whitelist
tools.allow in openclaw.json blocks ALL unlisted tools globally. Agent-level overrides cannot override it.

### S22-L2: Session tool snapshot
Sessions load tools at creation time. Config changes need /reset or new session to pick up new tools.

### S22-L3: exec vs dispatch vs shell service
- exec with host:"gateway" runs inside the OpenClaw container on KILO — no Docker, no CEG access
- Shell service at 100.100.101.1:3003 runs on CEG bare metal with sudo
- To run commands on CEG: exec → curl to :3003
- dispatch skill is NOT loaded in current sessions — Zuberi must use exec

### S22-L4: Chrome CDP Host header rejection
Chrome/Brave reject non-localhost Host headers for CDP. Docker sidecar with shared network namespace (network_mode: "service:gateway") solves this — both containers share localhost.

### S22-L5: UFW and iptables-persistent conflict
Installing iptables-persistent removes UFW. All UFW chain rules remain in iptables but are now managed by iptables-persistent.

### S22-L6: Docker on CEG needs proxy config
/etc/systemd/system/docker.service.d/http-proxy.conf required for Docker to pull images through Squid.

### S22-L7: PowerShell curl vs curl.exe
PowerShell aliases curl to Invoke-WebRequest. Use curl.exe for actual curl, or Invoke-RestMethod for PowerShell-native HTTP calls. JSON escaping in PowerShell is painful — use single quotes with double quotes inside, or use Invoke-RestMethod with -Body parameter.

## Key Paths
- ArchitectZuberi repo: C:\Users\PLUTO\github\ArchitectZuberi
- ZuberiChat repo: C:\Users\PLUTO\github\Repo\ZuberiChat
- OpenClaw config: C:\Users\PLUTO\openclaw_config\openclaw.json
- Docker compose: C:\Users\PLUTO\github\openclaw\docker-compose.yml
- Workspace: C:\Users\PLUTO\openclaw_workspace\
- Squid config: /etc/squid/squid.conf (CEG)
- Squid whitelist: /etc/squid/whitelist_domains.txt (CEG)
- Shell service: /etc/systemd/system/zuberi-shell.service (CEG)
- iptables rules: /etc/iptables/rules.v4 (CEG, managed by iptables-persistent)
- Docker proxy: /etc/systemd/system/docker.service.d/http-proxy.conf (CEG)
- apt proxy: /etc/apt/apt.conf.d/99proxy (CEG)
- Browser sidecar: kasmweb/chrome in docker-compose.yml, noVNC at localhost:6901
- Whisper build dir: /opt/zuberi/whisper/ (CEG)
- TabAudioRecorder extension: workspace/docs/Research/TabAudioRecorder/
