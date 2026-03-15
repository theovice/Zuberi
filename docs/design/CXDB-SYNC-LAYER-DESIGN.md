# CXDB Async Sync Layer — Design Document
**Author:** Architect 21 | Session 21 | 2026-03-14
**Status:** Design — ready for build
**Depends on:** lossless-claw v0.3.0 (installed), CXDB (CEG:9010), Chroma (CEG:8000)

---

## Problem

lossless-claw stores conversations in SQLite on KILO. This is fast and correct for the ContextEngine — but the data is invisible to CXDB (audit trail) and Chroma (semantic search). Without a sync layer:

- No conversation history in CXDB's chronological record
- No semantic search over past conversations
- ZuberiChat sidebar can only read from SQLite (local to KILO)
- If KILO's disk fails, all conversation history is lost (no off-machine backup)

## Solution

A lightweight Python service on CEG that periodically reads new rows from lossless-claw's SQLite (via a REST endpoint on KILO) and replicates them to CXDB and Chroma. Same dual-write pattern as the routing feedback shim (CEG:8100), proven in production.

## Architecture

```
KILO                                    CEG
┌─────────────────────┐                ┌─────────────────────┐
│ OpenClaw gateway    │                │                     │
│   └─ lossless-claw  │                │  sync-bridge :8200  │
│       └─ lcm.db     │  ──HTTP GET──► │    ├─► CXDB :9010   │
│       └─ sync API   │                │    └─► Chroma :8000  │
│          :18790     │                │                     │
└─────────────────────┘                └─────────────────────┘
```

Two components:

1. **Sync API** (KILO, port 18790) — thin read-only HTTP endpoint exposing lcm.db rows. Runs as a sidecar container or host process alongside the OpenClaw gateway. Reads SQLite directly via better-sqlite3 or Python sqlite3.

2. **Sync Bridge** (CEG, port 8200) — Python service that polls the Sync API on a timer, compares against a local high-water mark, and writes new rows to CXDB + Chroma.

## Why Two Components

SQLite is on KILO. CXDB and Chroma are on CEG. We can't read SQLite from CEG (no network filesystem, no direct file access). So we need an HTTP bridge — the Sync API exposes SQLite rows as JSON, and the Sync Bridge on CEG consumes them.

The alternative — running everything on KILO — would mean the sync service needs to reach CXDB and Chroma on CEG. That works too, but putting the writer close to the destination (CEG) is the established pattern (routing shim is on CEG writing to CEG services).

## Sync API (KILO:18790)

### Option A: Standalone Python script (recommended)

A single Python file using `http.server` + `sqlite3` (stdlib only, same pattern as the shell execution service). Reads lcm.db at the bind-mounted host path (`C:\Users\PLUTO\openclaw_config\lcm.db`). Read-only — never writes to SQLite.

Endpoints:

```
GET /health
  → {"ok": true, "db_path": "...", "tables": [...]}

GET /messages?after_seq=N&limit=100
  → {"messages": [
       {"messageId": 1, "conversationId": 1, "seq": 1,
        "role": "user", "content": "...", "tokenCount": 42,
        "createdAt": "2026-03-14T..."},
       ...
     ],
     "highWaterSeq": 157
    }

GET /summaries?after_id=S&limit=50
  → {"summaries": [
       {"summaryId": "abc-123", "conversationId": 1,
        "kind": "leaf", "depth": 0, "content": "...",
        "tokenCount": 1200, "createdAt": "2026-03-14T..."},
       ...
     ],
     "count": 12
    }

GET /conversations
  → {"conversations": [
       {"conversationId": 1, "sessionId": "...",
        "title": "...", "bootstrappedAt": "...",
        "createdAt": "..."},
       ...
     ]
    }
```

Binding: `127.0.0.1:18790` or Tailscale IP only. Not exposed to LAN.

Why not read directly inside the OpenClaw container? The container runs Node.js and we don't want to modify the gateway or lossless-claw. A separate process avoids coupling. The bind mount makes lcm.db visible on the host filesystem.

### Option B: Node.js script inside OpenClaw container

Add a script to the OpenClaw config directory that the container's entrypoint runs as a background process. Uses better-sqlite3 (already installed by lossless-claw). Avoids a second process on the host.

Downside: tighter coupling to the container lifecycle. If the gateway restarts, the script restarts too. Also requires modifying docker-compose.yml.

**Recommendation: Option A.** Decoupled, stdlib-only, matches existing patterns.

## Sync Bridge (CEG:8200)

Python FastAPI service (same stack as the routing shim). Runs as a systemd user service on CEG.

### Behavior

1. On startup, read high-water marks from a local state file (`/opt/zuberi/data/sync-state.json`):
   ```json
   {"lastMessageSeq": 0, "lastSummaryId": null, "lastSyncAt": null}
   ```

2. Every 30 seconds (configurable), poll the Sync API:
   - `GET http://100.127.23.52:18790/messages?after_seq={lastMessageSeq}&limit=100`
   - `GET http://100.127.23.52:18790/summaries?after_id={lastSummaryId}&limit=50`

3. For each new **message**:
   - Append to CXDB as a turn in context `zuberi-conversations-{conversationId}`:
     ```
     POST http://100.100.101.1:9010/v1/contexts/{contextId}/append
     {
       "descriptor_type": "zuberi.conversation.Message",
       "type_version": 1,
       "data": {
         "role": "user|assistant",
         "text": "...",
         "seq": 42,
         "tokenCount": 150,
         "sourceMessageId": 1,
         "createdAt": "2026-03-14T..."
       }
     }
     ```
   - Create CXDB context on first message for a new conversationId (lazy):
     ```
     POST http://100.100.101.1:9010/v1/contexts/create
     {"metadata": {"type": "conversation", "conversationId": 1, "sessionId": "..."}}
     ```

4. For each new **summary**:
   - Append to CXDB as a turn in the same conversation context:
     ```
     POST http://100.100.101.1:9010/v1/contexts/{contextId}/append
     {
       "descriptor_type": "zuberi.conversation.Summary",
       "type_version": 1,
       "data": {
         "summaryId": "abc-123",
         "kind": "leaf|condensed",
         "depth": 0,
         "text": "...",
         "tokenCount": 1200,
         "createdAt": "2026-03-14T..."
       }
     }
     ```
   - Upsert to Chroma collection `zuberi_conversations`:
     ```python
     collection.upsert(
       ids=[summary_id],
       documents=[summary_content],
       metadatas=[{
         "conversationId": 1,
         "kind": "leaf",
         "depth": 0,
         "tokenCount": 1200,
         "cxdb_context_id": "zuberi-conversations-1",
         "createdAt": "2026-03-14T..."
       }]
     )
     ```
   - Chroma computes embeddings automatically via its configured model (all-MiniLM-L6-v2 default, upgrade to BGE-M3 later).

5. Update high-water marks after successful writes. Write state file atomically.

6. If CXDB write fails: log error, do not advance high-water mark, retry next cycle.

7. If Chroma write fails: log warning, still advance (Chroma is secondary — same policy as routing shim).

### Endpoints

```
GET /health      → {"ok": true, "lastSync": "...", "lastMessageSeq": N}
GET /status      → {"messagesReplicated": N, "summariesReplicated": N, "errors": [...]}
POST /sync-now   → Trigger immediate sync cycle (for testing)
```

Binding: Tailscale IP only (100.100.101.1:8200).

### CXDB Type Descriptors

New types (defined inline per-turn, no registry endpoint needed):

| Descriptor | Version | Payload Fields |
|------------|---------|----------------|
| `zuberi.conversation.Message` | 1 | role, text, seq, tokenCount, sourceMessageId, createdAt |
| `zuberi.conversation.Summary` | 1 | summaryId, kind, depth, text, tokenCount, createdAt |

These follow the existing `zuberi.memory.*` naming convention.

### CXDB Context Strategy

One CXDB context per lossless-claw conversation. Context naming: use a metadata tag `{"type": "conversation", "conversationId": N}` to link back to SQLite.

Currently ZuberiChat has a single persistent session, so there will be one conversation context. When multi-conversation support is added to ZuberiChat, each conversation gets its own CXDB context automatically.

This keeps contexts small (per the CXDB performance guidance — large contexts slow down reads).

### Chroma Collection

Collection: `zuberi_conversations` (separate from `router_records` used by RTL-058).

Only summaries go into Chroma — not individual messages. Summaries are the right unit for semantic search: they're distilled, they have reasonable token counts (1200-2000), and they cover meaningful conversation segments. Indexing every message would create noise.

Future: when BGE-M3 is deployed, switch Chroma's embedding function. For now, the default all-MiniLM-L6-v2 is sufficient for initial testing.

### Idempotency

The Sync Bridge uses high-water marks (message seq, summary ID) to avoid duplicates. This is simpler than the routing shim's record_id approach because SQLite provides monotonically increasing sequence numbers.

Edge case: if the Sync API returns the same batch twice (network retry), the high-water mark hasn't advanced, so the bridge would attempt to re-write. CXDB appends are not idempotent — you'd get duplicate turns. Mitigation: the bridge tracks `sourceMessageId` in CXDB turn metadata and checks before appending. This is a best-effort dedup, not transactional.

For summaries, `summaryId` is a UUID generated by lossless-claw. Use it as the Chroma document ID (Chroma upsert is idempotent by ID) and include it in CXDB turn metadata for dedup checks.

## Deployment

### Sync API (KILO)

- Single Python file: `C:\Users\PLUTO\openclaw_config\sync-api.py`
- Runs as a background process (or Windows Task Scheduler)
- Alternatively: add to docker-compose.yml as a sidecar container with lcm.db bind-mounted read-only
- Port: 18790
- No external dependencies (stdlib only)

### Sync Bridge (CEG)

- Location: `/opt/zuberi/sync-bridge/`
- Files: `bridge.py`, `requirements.txt` (fastapi, uvicorn, httpx, chromadb)
- Systemd user service: `sync-bridge.service`
- Port: 8200
- State: `/opt/zuberi/data/sync-state.json`
- Logs: `/opt/zuberi/data/sync-bridge.log`

### Installation sequence

1. Deploy Sync API on KILO (ccode prompt)
2. Deploy Sync Bridge on CEG (Zuberi via shell service, or ccode SCP)
3. Test: trigger sync, verify CXDB context created, verify Chroma documents
4. Enable systemd timer or polling loop
5. Monitor for one session cycle

## What This Enables

Once the sync layer is running:

- **CXDB has a complete conversation audit trail** — every message and summary, chronologically ordered, in append-only storage on CEG.
- **Chroma has semantic search over conversation summaries** — "what did we discuss about trading strategies?" returns relevant summary chunks with metadata linking back to the full conversation.
- **ZuberiChat sidebar** can read from either SQLite (fast, local) or CXDB (if we want CEG-backed history). SQLite is the right choice for the sidebar; CXDB is the backup.
- **Disaster recovery** — if KILO's disk fails, conversation history can be reconstructed from CXDB turns on CEG.
- **Future: cross-session context** — Zuberi can query Chroma for relevant past conversations when starting a new task, similar to how RTL-058 Phase 3 queries past routing decisions.

## What This Does NOT Do

- Does not modify lossless-claw or OpenClaw in any way
- Does not write to SQLite — strictly read-only
- Does not replace CXDB's existing role (Notes, Decisions, Preferences, Tasks, routing feedback)
- Does not require BGE-M3 immediately — default Chroma embeddings work for v1
- Does not enable real-time search — 30-second polling means up to 30 seconds of lag

## Build Phases

**Phase 1 — Messages only (MVP):**
- Sync API on KILO (messages endpoint only)
- Sync Bridge on CEG (CXDB writes only, no Chroma)
- Verify: CXDB context with conversation turns

**Phase 2 — Summaries + Chroma:**
- Add summaries endpoint to Sync API
- Add Chroma writes to Sync Bridge
- Verify: semantic search returns relevant summaries

**Phase 3 — BGE-M3 + sidebar:**
- Deploy BGE-M3 on CEG (sentence-transformers or Ollama)
- Switch Chroma embedding function
- Wire ZuberiChat sidebar to SQLite conversation list

## Open Questions

1. **Sync API deployment model** — standalone Python process vs. Docker sidecar? Sidecar is cleaner (lives in docker-compose.yml, restarts with gateway) but requires Dockerfile modification or a second compose service. Standalone is simpler but needs manual process management on Windows.

2. **Polling interval** — 30 seconds is conservative. Could go to 10 seconds for near-real-time, or 5 minutes if lag doesn't matter. The bridge is stateless between polls, so the interval only affects freshness.

3. **Message content truncation** — should we store full message content in CXDB, or truncate long messages? Full content is better for audit but increases CXDB storage. Summaries are already concise. Messages can be large (tool outputs, code blocks). Recommendation: store full content, monitor disk usage.

4. **Backfill** — when the sync layer starts, should it backfill all existing SQLite data, or only sync forward? Backfill is simple (start with after_seq=0) and ensures CXDB has the complete record. Recommendation: backfill on first run.

---

*This design is ready for a ccode build prompt. Phase 1 (Sync API + CXDB-only bridge) can ship in a single session. Phase 2 adds Chroma. Phase 3 adds BGE-M3 and the sidebar.*
