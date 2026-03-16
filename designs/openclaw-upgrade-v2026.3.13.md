# OpenClaw Upgrade Plan: v2026.3.8 → v2026.3.13
# Created: 2026-03-15 | Session 21
# Operator: James Mwaweru
# Executor: CC (ccode)

## Prerequisites

- Backup completed (C:\Users\PLUTO\openclaw_config\backup-working-2026-03-15\)
- Zuberi online and responding (confirmed)
- Dashboard accessible (confirmed)
- lossless-claw v0.3.0 active with 437+ messages in lcm.db

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| lossless-claw incompatible with new plugin-sdk | Medium | High — loses conversation persistence | Test plugin loads before sending messages. Rollback image tag if broken. |
| Config schema changes reject current openclaw.json | Medium | Medium — gateway won't start | Compare schema before/after. Keep backup. |
| Session file format change | Low | Medium — lose session state | Backup sessions.json. Worst case: new session, lossless-claw still has history. |
| Docker compose changes needed | Medium | Low — easy to fix | Read upgrade notes for new env vars or mount changes. |
| Sync API breaks (lcm.db schema change) | Low | Medium — sync pipeline stops | Check lcm.db schema after upgrade. Sync bridge has error handling. |

## Phases

### Phase 1: Pre-flight (read-only, no changes)

1. Verify backup exists and is complete
2. Record current state:
   - docker images — note exact image hash for v2026.3.8
   - lcm.db file size and row counts (messages, summaries, conversations)
   - sessions.json contents
   - List of all env vars in docker-compose.yml
3. Check lossless-claw compatibility:
   - Read v2026.3.13 changelog for plugin-sdk changes
   - Check if lossless-claw v0.3.0 has a minimum/maximum OpenClaw version
   - Look for breaking changes in ContextEngine plugin interface
4. Pull new image WITHOUT switching to it:
   - docker pull ghcr.io/openclaw/openclaw:2026.3.13
   - This downloads but does not activate

### Phase 2: Upgrade

5. Stop gateway:
   - cd C:\Users\PLUTO\github\openclaw
   - docker compose down
6. Update docker-compose.yml:
   - Change image tag from 2026.3.8 to 2026.3.13
   - Add OPENCLAW_TZ=America/Chicago (new in v2026.3.13, replaces LCM_TIMEZONE)
   - Keep all existing env vars and mounts
7. Start gateway:
   - docker compose up -d
   - Wait 30 seconds (longer than usual — new version may run migrations)

### Phase 3: Verification

8. Check gateway health:
   - docker logs openclaw-openclaw-gateway-1 --tail=30
   - Look for: clean startup, no schema errors, lossless-claw loaded
   - EXPECTED WARNINGS: dangerouslyDisableDeviceAuth=true (known, keep)
9. Check lossless-claw survived:
   - docker exec openclaw-openclaw-gateway-1 sh -c "ls -la /home/node/.openclaw/lcm.db"
   - Verify file size matches pre-upgrade
   - If lcm.db is gone or reset to 4096 bytes: ROLLBACK immediately
10. Check dashboard accessible:
    - Open http://localhost:18789 in browser
    - Paste gateway token, click Connect
    - Must show Online status
11. Check ZuberiChat connects:
    - Open Zuberi from Start menu
    - Must connect (check gateway logs for "webchat connected")
12. Send test message to Zuberi:
    - Ask her anything simple ("What day is it?")
    - Must get a response
13. Check sync pipeline:
    - Verify Sync API still reads lcm.db: curl http://100.127.23.52:18790/health
    - Check sync bridge log on CEG: ssh ceg "tail -5 /opt/zuberi/data/sync-bridge.log"

### Phase 4: Post-upgrade cleanup

14. Verify new features available:
    - Check gateway logs for new capabilities (Chrome attach, backup CLI, etc.)
15. Test exec pipeline:
    - Tell Zuberi to run a command
    - With security:full + ask:off, should execute directly (same as pre-upgrade)
16. Update docs repo:
    - state/infrastructure.yaml: version → v2026.3.13
    - state/openclaw.yaml: version, any new config options
    - lessons/openclaw.yaml: add upgrade lesson

## Rollback Plan

If anything fails in Phase 3:

    cd C:\Users\PLUTO\github\openclaw
    docker compose down

Edit docker-compose.yml: change image tag back to 2026.3.8, remove OPENCLAW_TZ if it caused issues.

    docker compose up -d

If lcm.db was corrupted:

    copy C:\Users\PLUTO\openclaw_config\backup-working-2026-03-15\lcm.db C:\Users\PLUTO\openclaw_config\lcm.db

If sessions.json was corrupted:

    powershell -File C:\Users\PLUTO\openclaw_config\backup-working-2026-03-15\RESTORE.ps1

## Expected Conflicts

1. **Plugin-sdk bundling change** — v2026.3.13 rebuilt how plugins bundle. lossless-claw v0.3.0 was built against v2026.3.8's SDK. If the plugin fails to load, check for a lossless-claw update: `docker exec openclaw-openclaw-gateway-1 sh -c "openclaw plugins list"`

2. **OPENCLAW_TZ vs LCM_TIMEZONE** — both set timezone. Keep LCM_TIMEZONE as well until confirmed OPENCLAW_TZ propagates to the plugin. Remove LCM_TIMEZONE only after verifying lossless-claw respects OPENCLAW_TZ.

3. **Session format** — the session reset fix may change how sessions.json is structured. If gateway rejects the existing session, delete sessions.json and let it recreate (Zuberi loses in-flight context but lossless-claw preserves history).

4. **Gateway RPC timeout** — new bounded timeouts may surface as errors that were previously silent hangs. Monitor logs for timeout-related messages.

5. **Windows device auth fix** — "stop attaching device identity on local loopback" may change how ZuberiChat's connect RPC is handled. With dangerouslyDisableDeviceAuth=true this shouldn't matter, but watch for auth-related log changes.

## Estimated Time

- Phase 1: 5 minutes (read-only checks)
- Phase 2: 5 minutes (image swap + restart)
- Phase 3: 10 minutes (verification)
- Phase 4: 5 minutes (docs update)
- Total: ~25 minutes if clean, ~45 minutes if rollback needed
