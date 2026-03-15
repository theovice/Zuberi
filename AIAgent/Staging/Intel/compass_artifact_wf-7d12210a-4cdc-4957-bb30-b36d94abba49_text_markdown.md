# Upgrading OpenClaw to v2026.3.8 on Docker: a complete safety guide

**The upgrade from v2026.3.1-beta.1 to v2026.3.8 is safe but not trivial.** Only one intermediate release — v2026.3.2 — carries explicit breaking changes, and none of the four affect a standard Ollama-backed Docker setup without custom plugins or Zalo channels. The biggest win from this upgrade is a fix to the **critical Ollama 4096-token truncation bug** (issues #4028, #24068, #27278) that has likely been silently capping your context window. Your bind-mounted config and workspace directories will survive the rebuild intact, and `openclaw doctor --fix` will auto-migrate your config from `meta.lastTouchedVersion: 2026.2.22` to the new schema.

## Only v2026.3.2 introduced breaking changes — and they likely don't affect you

Between v2026.3.1 and v2026.3.8, OpenClaw shipped four stable releases: **v2026.3.1, v2026.3.2, v2026.3.7, and v2026.3.8** (the date-based versioning skips days with no release, so v2026.3.3 through v2026.3.6 don't exist). Only v2026.3.2 carries breaking-change markers — four in total:

1. **`tools.profile` now defaults to `messaging` for new installs.** Existing configs are unaffected. Since you have an existing `openclaw.json`, this is a no-op.
2. **ACP dispatch now defaults to enabled.** If you don't use ACP (Agent Communication Protocol) dispatch for multi-agent turn routing, add `acp.dispatch.enabled: false` to your config to suppress it. If you're unsure whether you use it, you almost certainly don't — safe to ignore.
3. **Plugin SDK removed `api.registerHttpHandler()`**, replaced by `api.registerHttpRoute()`. Only affects custom plugin authors. If you haven't written custom gateway plugins, skip this.
4. **Zalo Personal transport rewrite.** Only affects Zalo channel users. Irrelevant for an Ollama-backed CLI/gateway setup.

**Gateway WebSocket security was tightened in v2026.3.2**: plaintext `ws://` connections are now loopback-only by default. Since your Docker Compose uses `network_mode: "service:openclaw-gateway"` for the CLI service (which connects over `127.0.0.1`), this change is transparent. If you ever access the gateway from another host on your LAN, you'd need the `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` environment variable.

## The Ollama 4096-token bug fix is the most important reason to upgrade

Your setup routes Ollama through `host.docker.internal:11434`, and this upgrade addresses a **cluster of related bugs** that have plagued Ollama users since January 2026:

**Issue #4028** revealed that when OpenClaw uses Ollama via the OpenAI-compatible endpoint (`/v1/chat/completions`), the `pi-ai` package's `openai-completions.js` never passed `options.num_ctx` to Ollama. Since Ollama's default `num_ctx` is 4096 tokens, every model was silently truncated — your bootstrap files (SOUL.md, USER.md, etc.) were being cut off. **Issue #27278** confirmed this: session JSONL files showed exactly `"input": 4096` for every message regardless of the configured `contextWindow`.

**Issue #24068** showed that OpenClaw also failed to read context window sizes correctly from Ollama's `/api/show` endpoint, defaulting to 4096 even when models report 32,768 or higher.

Recent versions fixed this in two ways. First, OpenClaw now **injects `options.num_ctx` automatically** when using `api: "openai-completions"` with Ollama (disableable via `injectNumCtxForOpenAICompat: false`). Second, and more importantly, a **dedicated `ollama` API provider type** was added that talks directly to the native `/api/chat` endpoint, bypassing the `/v1` compatibility layer entirely.

**After upgrading, verify your Ollama provider config.** The official recommendation is to use `api: "ollama"` with the native URL (`http://host.docker.internal:11434` — no `/v1` suffix). This ensures correct `num_ctx` handling and reliable tool calling. If your current config uses `api: "openai-completions"` with a `/v1` suffix URL, change it:

```json
{
  "models": {
    "providers": {
      "ollama": {
        "url": "http://host.docker.internal:11434",
        "api": "ollama"
      }
    }
  }
}
```

The docs explicitly warn: **"Do not add /v1 to the URL. The /v1 path uses OpenAI-compatible mode, where tool calling is not reliable."** The native endpoint also supports streaming with tool calls, which the OpenAI-compat layer drops silently when `stream: true` is set (hardcoded in `openai-completions.js` line ~316).

## Config migration is automatic — `openclaw doctor --fix` handles it

OpenClaw tracks config provenance via `meta.lastTouchedVersion` in `openclaw.json`. With your current value of `2026.2.22` and the target of `2026.3.8`, the gateway will detect the version gap on first start. The migration mechanism works in layers:

**Auto-migration on startup** handles known legacy paths automatically. For example, top-level `heartbeat` config is auto-migrated into `agents.defaults.heartbeat` with merge semantics. The CHANGELOG confirms this pattern for several config restructurings between these versions.

**`openclaw doctor --fix`** is the primary post-upgrade tool. It audits the config schema, migrates deprecated settings, checks security configuration, and validates gateway service settings. Run it after every upgrade. In Docker, execute it via the CLI container:

```bash
docker compose exec openclaw-cli openclaw doctor --fix
```

**`openclaw config validate --json`** (new in v2026.3.2) lets you check config validity without making changes. Useful for pre-upgrade verification.

Key config additions between these versions that may interest you include `talk.silenceTimeoutMs` (Talk mode timeout), `agents.defaults.compaction` enhancements, `plugins.slots.contextEngine` (the new context engine plugin slot), and `browser.relayBindHost` for WSL2 Chrome relay binding. None of these require manual action — they're additive with sensible defaults.

## The recommended upgrade procedure for a locally-built Docker image

Since you're building from source rather than pulling from a registry, the upgrade path is slightly different from the standard `docker compose pull` workflow. Here is the safest sequence:

**Step 1 — Tag your current image as a backup.** This gives you an instant rollback target without needing to rebuild from the old source:

```powershell
docker tag openclaw:latest openclaw:backup-2026.3.1
```

**Step 2 — Stop the gateway gracefully and back up config:**

```powershell
docker compose stop openclaw-gateway
# Back up bind-mounted config (survives rebuilds, but belt-and-suspenders)
tar czf openclaw-backup-$(Get-Date -Format yyyyMMdd-HHmm).tgz $env:USERPROFILE\.openclaw\
```

**Step 3 — Pull the latest source and rebuild:**

```powershell
cd path\to\openclaw
git fetch --tags
git checkout v2026.3.8
docker compose build --no-cache
```

Note that v2026.3.7 restructured the Dockerfile into a **multi-stage build** producing a slimmer runtime image without build tools or source code. If your `docker-compose.yml` overrides the build context or Dockerfile path, verify it still works. The new build also supports `OPENCLAW_VARIANT=slim` for a bookworm-slim base, and v2026.3.8 further pruned dev dependencies.

**Step 4 — Start the gateway and run doctor:**

```powershell
docker compose up -d --force-recreate
docker compose logs -f openclaw-gateway   # Watch for startup errors
docker compose exec openclaw-cli openclaw doctor --fix
```

**Step 5 — Verify the Ollama connection and context window:**

```powershell
docker compose exec openclaw-cli openclaw models list
# Check that your Ollama models show correct context window sizes (not 4096)
```

**Alternative: switch to the official pre-built image.** OpenClaw publishes images to **`ghcr.io/openclaw/openclaw`** (not Docker Hub — the docs explicitly warn against similarly-named Hub images). Tags include `latest`, `main`, and version numbers. Switching eliminates the build step entirely:

```yaml
services:
  openclaw-gateway:
    image: ghcr.io/openclaw/openclaw:2026.3.8  # or :latest
    # ... rest of your config
```

This is the simplest path if you don't need local source modifications.

## The context-engine plugin preserves existing behavior by default

The **ContextEngine plugin interface** in v2026.3.7 is the largest architectural change in this upgrade window. It introduces a pluggable slot (`plugins.slots.contextEngine`) with lifecycle hooks for `bootstrap`, `ingest`, `assemble`, `compact`, `afterTurn`, `prepareSubagentSpawn`, and `onSubagentEnded`.

**The `LegacyContextEngine` wrapper is the default.** When no context-engine plugin is configured, OpenClaw wraps the existing compaction system in `LegacyContextEngine`, producing **zero behavior change**. You don't need to configure anything to keep your current compaction behavior.

Compaction itself got improvements in v2026.3.7: staged-summary merge now preserves **active task status, batch progress, latest user request, and follow-up commitments** — making compacted contexts significantly more useful. The safeguard structure was also hardened with exact fallback summary headings and sanitized compaction instruction text.

The first third-party plugin leveraging this is **lossless-claw** by Martian Engineering, which replaces sliding-window compaction with a DAG-based summarization system. It's optional and not installed by default.

## Skill loading evolved but workspace skills still take priority

Between these versions, skill loading saw security hardening rather than behavioral changes. The **load precedence** remains: workspace skills (highest) → user-level `~/.openclaw/skills` → bundled skills (lowest), plus any paths in `skills.load.extraDirs`.

Key skill-related changes: **v2026.3.8** pins per-skill tools root before writing downloaded archives (a security fix preventing path traversal outside the tools directory). **v2026.3.7** migrated bundled plugins from monolithic `openclaw/plugin-sdk` imports to scoped subpaths, though the root import still works for external/community skills. **v2026.3.8** also prefers bundled channel plugins over duplicate npm-installed copies during onboarding.

YAML frontmatter parsing and the skill format itself are unchanged. Hot-reload continues to work. Your existing workspace skills will load identically after the upgrade.

## Rollback plan: tag, switch, restart

If anything breaks post-upgrade, recovery takes under 60 seconds:

```powershell
# Stop the broken version
docker compose down

# Option A: Revert to your tagged backup image
# Edit docker-compose.yml to use openclaw:backup-2026.3.1
docker compose up -d

# Option B: If using GHCR, pin to the previous version
# Change image to ghcr.io/openclaw/openclaw:2026.3.2
docker compose up -d
```

Your bind-mounted `~/.openclaw/` config and workspace directories survive across container rebuilds — this is the key advantage of your current setup. Sessions, workspace files, MEMORY.md, and `openclaw.json` all live on the host filesystem.

**One caveat**: if `openclaw doctor --fix` mutated your config during the upgrade, the rollback might encounter a forward-migrated config file running on an older binary. To protect against this, include `openclaw.json` in your pre-upgrade backup. If rolling back, restore it:

```powershell
# Restore pre-upgrade config
copy openclaw-backup\openclaw.json $env:USERPROFILE\.openclaw\openclaw.json
```

## Conclusion

This upgrade is lower-risk than it appears. The four breaking changes in v2026.3.2 target plugin authors, Zalo users, and new-install defaults — none of which apply to your Ollama-backed Docker setup. The **critical fix is the Ollama `num_ctx` injection** and the new native `api: "ollama"` provider type, which together eliminate the silent 4096-token truncation that has been degrading your conversations. After rebuilding, run `openclaw doctor --fix`, switch your provider config to `api: "ollama"` without the `/v1` URL suffix, and verify correct context window detection via `openclaw models list`. The new context-engine plugin, backup CLI commands, and Docker image slimming are quality-of-life wins that require no manual action. Tag your current image before starting, keep your config backup, and the entire upgrade is reversible in seconds.