# CCODE-HANDOFF -- Zuberi Project

**Updated:** 2026-03-12, Session 19

---

## 1. Quick Reference

| Key | Value |
|-----|-------|
| ZuberiChat repo | `C:\Users\PLUTO\github\Repo\ZuberiChat` |
| ZuberiChat version | **v1.0.14** (`src-tauri/tauri.conf.json`) |
| Test count | 155 Vitest (4 suites: smoke, permissions, markdown-render, copy-button) |
| OpenClaw config | `C:\Users\PLUTO\openclaw_config\openclaw.json` |
| OpenClaw version | v2026.3.8 (`ghcr.io/openclaw/openclaw:2026.3.8`) |
| OpenClaw backup | `C:\Users\PLUTO\openclaw_config\openclaw.json.bak4` |
| Workspace | `C:\Users\PLUTO\openclaw_workspace` |
| KILO Tailscale IP | `100.127.23.52` |
| CEG Tailscale IP | `100.100.101.1` |
| CEG SSH alias | `ceg` (use `ssh ceg '<command>'` from KILO) |

---

## 2. Architecture Diagram

```
KILO (100.127.23.52)                          CEG (100.100.101.1)
========================                      ========================
 OpenClaw v2026.3.8                            SearXNG         :8888
   Dashboard      :18789                       n8n             :5678
   Gateway WS     :18789/ws                    CXDB (API)      :9010
                                               CXDB (gRPC)     :9009
 Ollama (3 disciplines)                        Kanban          :3001
   gpt-oss:20b      (primary)                  Usage Tracker   :3002
   qwen2.5-coder:14b (code)                    AgenticMail     :3100
   qwen3-vl:8b       (vision)                  Dispatch        :3003
                                               Chroma          :8000
 ZuberiChat (Tauri v2 desktop)                 Routing Shim    :8100
   Installed via NSIS                           ccode CLI (auth'd)
        |                                            |
        +------------ Tailscale Mesh ----------------+
```

---

## 3. Disciplines

| Model | Discipline | Context Window | Role |
|-------|-----------|----------------|------|
| `gpt-oss:20b` | General expertise | 131072 | **Primary** |
| `qwen2.5-coder:14b` | Software engineering | 131072 | Active |
| `qwen3-vl:8b` | Visual analysis | 131072 | Active |

> **WARNING:** Do NOT add `qwen3:14b` or `qwen3:14b-fast`. Confirmed stuck-in-reasoning bug -- model enters infinite think loop and never produces output.

---

## 4. OpenClaw Config Key Settings

| Setting | Value | Notes |
|---------|-------|-------|
| API mode | Native Ollama | Not OpenAI `/v1` compatible endpoint |
| `baseUrl` | `http://host.docker.internal:11434` | Ollama from inside Docker |
| `heartbeat.every` | `0m` | **Disabled** -- was colliding with chat session |
| `thinkingDefault` | `off` | |
| `reasoning` | `false` (all disciplines) | Do not enable without explicit instruction |
| `compaction.mode` | `safeguard` | |
| `reserveTokensFloor` | `4000` | 12% of 32K working context |
| `memoryFlush.enabled` | `true` | |
| `memoryFlush.softThresholdTokens` | `2000` | Flush trigger: contextWindow - 4000 - 2000 |
| `execAsk` | `on-miss` | Default approval mode for exec commands |
| `gateway.auth.token` | References env var | Never stored in workspace files |

**Notes:**
- Gateway restart: `docker compose down && docker compose up -d` (NOT `docker restart`)
- Model `name` field is **required** in config -- empty/missing causes crash loop

---

## 5. Workspace Root Files

| File | Version | Loaded |
|------|---------|--------|
| `TOOLS.md` | v1.1.0 | Every turn |
| `AGENTS.md` | v1.0.0 | Every turn |
| `SOUL.md` | v0.1.1 | Every turn |
| `MEMORY.md` | v1.0.0 | Every turn |
| `IDENTITY.md` | -- | Every turn |
| `USER.md` | -- | Every turn |

Total root file budget: ~5,916 tokens/turn.

---

## 6. Workspace Skills

15 skills (auto-activate via YAML frontmatter descriptions):

1. `capability-awareness`
2. `cxdb`
3. `dispatch`
4. `email`
5. `error-recovery`
6. `heartbeat`
7. `infrastructure`
8. `model-router`
9. `n8n`
10. `ollama`
11. `searxng`
12. `stack-guidance`
13. `trading-knowledge`
14. `usage-tracking`
15. `web-fetch`

Fallback self-load path: `exec cat /home/node/.openclaw/workspace/skills/<name>/SKILL.md`

---

## 7. CEG Service Health Endpoints

| Service | Port | Health Endpoint | Method |
|---------|------|-----------------|--------|
| SearXNG | 8888 | `/healthz` | GET |
| CXDB | 9010 | `/healthz` | GET |
| Kanban | 3001 | `/` (root) | GET |
| Usage Tracker | 3002 | `/health` | GET |
| AgenticMail | 3100 | `/api/agenticmail/health` | GET |
| Dispatch | 3003 | `/health` | GET |
| Chroma | 8000 | `/api/v2/heartbeat` | GET |
| Routing Shim | 8100 | `/health` | GET |
| n8n | 5678 | `/` (root) | GET |

> **AgenticMail:** The endpoint is `/api/agenticmail/health`, NOT `/health` (returns 404).

---

## 8. Spending Controls

| Setting | Value |
|---------|-------|
| Monthly budget | $20 |
| Alert threshold | $15 |
| Per-dispatch confirm | Above $1 |
| Tracker URL | `http://100.100.101.1:3002/limits` |

---

## 9. ZuberiChat Dev Rules

1. **Kill existing dev server first.** Always terminate any running `pnpm tauri dev` before starting another.
2. **Run 155 tests before AND after.** `npx vitest run` must show 155/155 passing on both sides of every change.
3. **Never mutate refs inside state updaters.** React 19 StrictMode double-invokes updaters; ref mutation inside causes wrong-branch bugs.
4. **Tauri uses `invoke()` not `fetch()`.** All Rust backend calls go through `@tauri-apps/api/core` invoke, not HTTP.
5. **No GitHub Actions.** Deleted entirely. Update via `scripts/update-local.ps1` (test, build, verify, install).
6. **Version bump required.** Every code change bumps `version` in `src-tauri/tauri.conf.json`.
7. **About version is hardcoded.** Update `ZuberiContextMenu.tsx` alert string to match tauri.conf.json version.
8. **Report actual version.** Every FINAL REPORT must include the version from `tauri.conf.json`.

---

## 10. Screenshot Capture

The mock browser preview (`preview_start browser-preview` + `preview_screenshot` at `localhost:3000`) is **retired**.

To capture a screenshot of the live ZuberiChat window:

```
powershell -File C:\Users\PLUTO\github\Repo\ZuberiChat\scripts\capture-window.ps1
```

- Output: `CAPTURE_OK|<filepath>` on success, `CAPTURE_FAIL|<reason>` on failure (exit 1)
- Requires ZuberiChat to be running and not minimized
- Optional: `-ProcessName <name>`, `-WindowTitle <substring>`, `-OutputPath <path>`
- Screenshots saved to: `C:\Users\PLUTO\github\Repo\ZuberiChat\screenshots\` (gitignored)

**PowerShell 5.1 quirks:** Wrap `Get-Process` pipelines in `@()` for strict mode `.Count`, use ASCII dashes `--` not em-dashes.

---

## 11. Key Warnings

- **No `jq` in OpenClaw container.** Parse JSON with Node.js one-liners or grep.
- **No bash operators in OpenClaw exec.** Use PowerShell syntax on KILO; the container shell is `sh` not `bash`.
- **No nested triple-backtick code blocks in prompts.** Breaks markdown parsing in OpenClaw.
- **API keys never in workspace files.** Gateway token, Anthropic key, etc. live in env vars or config files only.
- **Back up configs before editing.** Always `cp openclaw.json openclaw.json.bakN` before changes.
- **PowerShell `Set-Content` writes BOM.** Use `[System.IO.File]::WriteAllText()` with `UTF8Encoding($false)` for clean UTF-8.
- **OpenClaw container can `curl` CEG but cannot SSH.** Use `docker exec` with `curl` for cross-host checks.

---

## 12. Current P1 Blockers

1. **Internal monologue leakage.** `gpt-oss:20b` emits chain-of-thought reasoning as regular content -- no `<think>` separation. The model's planning text (e.g., "User wants X. We need to SSH...") renders as visible assistant messages alongside the actual response. Deep research into model template / Ollama Modelfile configuration has not yet been run.

2. **Approval card reliability.** The v1.0.11 WebSocket queue fix reduced silent drops, but approval cards still stack in the UI and Zuberi retries tool commands instead of waiting for user approval. The resolve RPC sometimes races with the next exec request.

---

## 13. Credential Locations

| Credential | Location | Notes |
|------------|----------|-------|
| Anthropic API key | CEG `~/.bashrc` + systemd env | Never in workspace |
| AgenticMail master key | CEG `~/.agenticmail/config.json` | |
| Gmail App Password | CEG `~/.agenticmail/` | |
| n8n API key | KILO workspace skill (`skills/n8n/SKILL.md`) | Marked SECRET in file |

> **Values are NEVER stored in this handoff file.** Only locations are documented.
---

## 14. Sidebar (Disabled -- Pending Re-implementation)

The sidebar was hidden in RTL-049 (v1.0.0). All code is preserved with comment markers. CSS is still in `globals.css`. No files need to be created -- only uncomment and adjust.

### Current State

| Component | File | Lines | Status |
|-----------|------|-------|--------|
| Sidebar JSX | `App.tsx` | 48-54 | Commented out (marker: `SIDEBAR HIDDEN -- RTL-049`) |
| Sidebar toggle button | `Titlebar.tsx` | 94-107 | Commented out (marker: `SIDEBAR TOGGLE HIDDEN -- RTL-049`) |
| Kanban Board (sidebar) | `Sidebar.tsx` | 63-73 | Commented out (marker: `KANBAN REMOVED -- RTL-049`) |
| Kanban Board (status bar) | `ClawdChatInterface.tsx` | 1285-1293 | **Active** (relocated here) |
| Sidebar state management | `App.tsx` | 7-28 | **Active** (localStorage key: `zuberi:sidebar-open`) |
| Ctrl+, keyboard shortcut | `Titlebar.tsx` | 41-43 | **Active** (emits `toggle-sidebar` event, no-op while hidden) |
| Sidebar CSS | `globals.css` | 541-601 | **Active** (all classes still present) |
| Update indicator (sidebar) | `Sidebar.tsx` | 75-93 | In sidebar (hidden with sidebar) |
| Update indicator (titlebar) | `Titlebar.tsx` | 118-128 | **Active** amber dot in titlebar |

### Sidebar Items (when restored)

1. **New chat** -- `SquarePen` icon, emits `new-conversation` event
2. **Settings** -- `Settings` icon, emits `open-settings` event
3. *(spacer)*
4. **Kanban Board** -- `LayoutGrid` icon, opens `http://100.100.101.1:3001` via `invoke(open_url_in_browser)`
5. **Update available** -- amber text, calls `invoke(run_local_update)` with confirm dialog

### Sidebar Component Props

`Sidebar.tsx`: `{ open: boolean, updateAvailable?: boolean, availableVersion?: string | null }`
`Titlebar.tsx`: `{ sidebarOpen?: boolean, onToggleSidebar?: () => void, updateAvailable?: boolean, availableVersion?: string | null }`

### How to Restore

1. **App.tsx** L48-54: Uncomment `<Sidebar open={sidebarOpen} updateAvailable={updateAvailable} availableVersion={availableVersion} />`
2. **Titlebar.tsx** L94-107: Uncomment the `PanelLeft` toggle button block
3. **Sidebar.tsx** L63-73: Uncomment the Kanban Board button (optional -- it also lives in the status bar now)
4. **No CSS changes needed** -- all `.sidebar*` classes are already in `globals.css`

### Architecture Notes

- Sidebar width: 260px fixed inner, animates open/close via `transition: width`
- Top padding 44px clears the 36px titlebar
- State persists in localStorage (`zuberi:sidebar-open`)
- `Ctrl+,` shortcut already wired -- just needs the sidebar to be visible
- Update indicator exists in BOTH sidebar and titlebar (amber dot) -- both use `invoke(run_local_update)`