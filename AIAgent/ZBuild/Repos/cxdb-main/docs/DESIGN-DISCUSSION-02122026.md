# DESIGN DISCUSSION (2026-02-12)

## Topic
Objective misunderstandings of the CXDB core idea:

- turn-oriented arbitrary data structures
- projected and rendered with domain types

## Scope and Method
This discussion compares implementation reality against docs and type/rendering claims across:

- server HTTP routes and protocol handling
- projection and registry modules
- frontend rendering/type surfaces
- published docs in `README.md` and `docs/*`

The goal is not style feedback. The goal is objective mismatches where behavior and stated design diverge.

## Findings (Severity-Ordered)

### 1) High: Public docs describe HTTP write paths that are not implemented
The docs describe create/fork/append write APIs over HTTP, but the current Rust HTTP handler is read-focused and does not implement those POST routes.

Evidence:

- Docs describing HTTP writes:
  - `docs/getting-started.md:77`
  - `docs/getting-started.md:97`
  - `docs/http-api.md:71`
  - `docs/http-api.md:235`
  - `server/src/http/README.md:15`
- Actual route handling:
  - `server/src/http/mod.rs:87`
  - `server/src/http/mod.rs:97`
  - `server/src/http/mod.rs:200`
  - `server/src/http/mod.rs:484`
  - fallthrough not-found: `server/src/http/mod.rs:895`

Why this matters to the core idea:

- If docs claim one write surface and implementation only supports another, users form incorrect mental models about how turn-oriented data is ingested and typed.

---

### 2) High: Type-registry and projection docs promise features not implemented
Docs claim support for semantics and nested/map schema forms that the current runtime schema and projector do not actually process.

Evidence:

- Docs promising fields/features:
  - `docs/type-registry.md:110` (`semantic`)
  - `docs/type-registry.md:113` (`nested`)
  - `docs/type-registry.md:127` (`map`)
  - nested example: `server/src/projection/README.md:228`
- Registry implementation schema:
  - `FieldDef` does not include `semantic` or `nested`: `server/src/registry/mod.rs:51`
  - supports `ref` via `type_ref`: `server/src/registry/mod.rs:57`
  - items parser recognizes simple string or object with `{ type: "ref", ref: ... }`: `server/src/registry/mod.rs:336`
- Projection implementation:
  - recursive support is keyed on `field_type == "ref"`: `server/src/projection/mod.rs:147`
  - supported types list in code path is narrower than docs: `server/src/projection/mod.rs:153`

Why this matters to the core idea:

- “Projected with domain types” only works when registry contracts are truthful and consistent with projector behavior.
- Current docs overstate domain-type expressiveness compared to the running system.

---

### 3) Medium: First-turn depth semantics are inconsistent (0 vs 1)
Some docs/comments describe first/root turn depth as 1, but store code uses 0 for first appended turn in a context.

Evidence:

- Implementation:
  - first append on empty context sets depth 0: `server/src/turn_store/mod.rs:397`
  - metadata extraction assumes first turn is depth 0: `server/src/store.rs:138`, `server/src/store.rs:161`
- Docs/comments claiming depth 1:
  - `docs/architecture.md:51`
  - `docs/getting-started.md:115`
  - `clients/go/types/conversation.go:165`

Why this matters to the core idea:

- Turn orientation depends on clear depth/lineage semantics.
- Inconsistency causes mistaken assumptions for ordering, metadata conventions, and migration logic.

---

### 4) Medium: Idempotency is documented and exposed by clients, but not enforced server-side
Protocol/docs and SDKs present idempotency as supported behavior, but append handling currently parses the key without applying dedupe/lookup semantics.

Evidence:

- Documented behavior:
  - `docs/protocol.md:211`
- Client SDK surface:
  - `clients/go/turn.go:32`
- Server parsing only:
  - key parsed: `server/src/protocol/mod.rs:177`
  - append path does not consume it: `server/src/main.rs:262`, `server/src/store.rs:187`

Why this matters to the core idea:

- Turn append is the primary operation. Idempotency claims shape correctness expectations for distributed writers and retries.

---

### 5) Medium: Canonical conversation type ID is inconsistent (`.` vs `:`)
Canonical conversation ID appears in both dotted and colon forms across repo surfaces.

Evidence:

- Dotted form:
  - `clients/go/types/conversation.go:20`
  - `clients/rust/src/types/conversation.rs:8`
  - `fixtures/registry/conversation-bundle.json:4`
- Colon form:
  - `frontend/types/conversation.ts:15`
  - `frontend/lib/renderer-registry.ts:21`

Why this matters to the core idea:

- Domain-type projection/rendering depends on stable type IDs.
- Mixed canonical IDs break renderer lookup and create false “unknown type” behavior.

---

### 6) Medium: “Arbitrary data structures” is true for storage, but typed projection requires map-shaped roots
Core docs emphasize opaque/flexible payload handling, but the typed projection pipeline requires a map at the top level.

Evidence:

- Opaque/flexible positioning:
  - `NEW_SPEC.md:9`
  - `NEW_SPEC.md:46`
- Projection hard requirement:
  - map-only normalization: `server/src/projection/mod.rs:96`
  - non-map rejected: `server/src/projection/mod.rs:98`

Why this matters to the core idea:

- Arbitrary payload bytes are supported at storage level.
- Arbitrary payload shapes are not universally supported by typed projection.
- This is a valid architectural constraint, but it is currently under-specified in high-level messaging.

## Implications

- Users may mischoose APIs (HTTP writes vs binary writes).
- Type authors may publish schemas that appear valid in docs but silently fail to project as expected.
- Frontend renderer matching can fail due to type ID mismatches, creating misleading “fallback renderer only” behavior.
- Retry safety assumptions can be incorrect under failure/reconnect conditions.

## Decision Points

1. Should HTTP remain read-mostly or implement documented create/fork/append writes?
2. Is first-turn depth canonicalized to 0 or 1 going forward?
3. Which registry schema is the source of truth:
   - current minimal runtime schema (`ref`, simple `items`) or
   - richer documented schema (`semantic`, `nested`, `map`)?
4. Should idempotency remain documented now, or be gated behind implementation completion?
5. What is the single canonical conversation type ID string?
6. Should top-level non-map payloads be:
   - unsupported in typed projection (documented explicitly), or
   - supported with a generalized projection mode?

## Suggested Next Actions

1. Pick a canonical behavior per decision point above.
2. Update docs to match implementation immediately where behavior is intentionally unchanged.
3. Open targeted implementation tasks where docs are intended as near-term contract.
4. Add regression tests that pin:
   - HTTP route contract
   - registry schema acceptance/rejection
   - depth semantics
   - type ID canonical mapping
   - idempotency behavior (if enabled)

---

## Outside-In: What Agentic Workloads Actually Need from CXDB

The findings above compare docs to implementation. This section steps outside the codebase entirely and asks: if you are an agent (or the system running agents), what do you need from a context store, and where does CXDB's current design serve or fail those needs?

The premise of CXDB is that it exists *for agents*. The README says "AI Context Store for agents and LLMs." Every design decision should be evaluated against whether it makes agent workloads easier, more observable, and more correct. The findings below are ordered by how directly they block real agent adoption.

---

### 7) Critical: Agents can't write without implementing a custom binary protocol

This is the single largest barrier to agent adoption.

The only implemented write path is the binary protocol on `:9009`. Writing a turn requires: opening a TCP connection, sending a HELLO handshake, serializing msgpack with numeric field tags, computing BLAKE3 hashes, optionally compressing with Zstd, and framing everything in a custom wire format with little-endian headers.

Today, the only clients that can do this are the Go SDK and the Rust SDK. There is no Python client. There is no TypeScript/JavaScript client. There is no `curl` command that works for writes (despite the README Quick Start showing exactly that).

Evidence:

- README Quick Start shows `curl -X POST` for writes: `README.md:22-31`
- HTTP write routes documented but not implemented: Finding #1 above
- Binary protocol write path: `server/src/main.rs:257-306`
- Existing clients: `clients/rust/` (Rust), `clients/go/` (Go, referenced in docs)
- No Python or JS/TS client exists in the repo

Why this matters:

- The dominant agent frameworks today are Python (LangChain, CrewAI, AutoGen, Agents SDK) and TypeScript (Vercel AI SDK, LangChain.js). Neither ecosystem can use CXDB for writes.
- An agent framework evaluating CXDB will try the README Quick Start, hit a 404 on `POST /v1/contexts`, and move on.
- HTTP writes don't need to replace the binary protocol. They need to exist alongside it as the accessibility path. The binary protocol remains the performance path for high-throughput Go/Rust writers.

Decision:

- Implement HTTP write paths (create, fork, append) as documented. This is not a nice-to-have; it is a prerequisite for agent adoption outside Go/Rust.

---

### 8) High: Context lifecycle is unmodeled — agents start, succeed, fail, and get cancelled

A context in CXDB is a mutable head pointer over a turn chain. It has a `created_at` timestamp. It has no concept of completion, failure, cancellation, or duration.

From the perspective of anyone operating agents:

- "How many agent runs are currently active?" — No way to distinguish active from finished.
- "Which agent runs failed?" — No failure state.
- "How long did this agent run take?" — No end timestamp.
- "Was this run cancelled by a user?" — No cancellation status.

Evidence:

- `ContextHead` has only `context_id`, `head_turn_id`, `head_depth`, `created_at_unix_ms`: `server/src/turn_store/mod.rs`
- `ContextMetadata` has `client_tag`, `title`, `labels`, `provenance` — all set once at creation: `server/src/store.rs:73-78`
- No `status`, `completed_at`, `error`, or `duration` field exists anywhere
- `SessionTracker` tracks TCP connection liveness, not context lifecycle: `server/src/metrics.rs`
- SSE events include `ClientDisconnected` with orphaned contexts, but this is connection-level, not context-level: `server/src/events.rs:51-58`

Why this matters:

- Agent orchestrators (the systems that spawn and supervise agents) need to query "show me all running agents" and "show me all failed agents." CQL can filter by `is_live` (TCP connection alive), but connection liveness is not the same as context lifecycle. An agent can finish successfully and disconnect — that's not a failure.
- Without lifecycle status, every consumer must infer state by reading the last turn of every context and hoping a status field exists in the payload. This pushes a platform concern into application-level convention.
- The `provenance` model captures who started the context and why, but not how it ended.

Possible approaches:

- a) Add mutable context-level metadata: `status` (active/completed/failed/cancelled), `completed_at`, `error_message`. Updatable via a new `CTX_UPDATE` binary message or HTTP PATCH.
- b) Define a "terminal turn" convention: the last turn in a completed context has a well-known type (e.g., `cxdb.ContextResult`) with status/error/metrics. The server recognizes this type and updates CQL indexes.
- c) Both — mutable metadata for fast queries, terminal turn for the full record.

---

### 9) High: No streaming or incremental turn model

Modern LLM agents stream their responses token-by-token. Tool executions produce incremental output. CXDB requires the complete payload before a turn can be appended.

Evidence:

- `append_turn` requires fully materialized `payload_bytes` with pre-computed `content_hash`: `server/src/store.rs:187-198`
- Content hash is verified against the full payload on append: `server/src/store.rs:216-221`
- The protocol spec acknowledges this gap: `docs/protocol.md:525` lists `STREAM_APPEND` as a v2 feature
- SSE `TurnAppended` events fire only after the turn is fully committed: `server/src/main.rs:280-287`

Why this matters:

- An agent supervisor watching a live run sees nothing until each turn is fully complete. For a 30-second tool execution or a long LLM generation, there is no progress signal.
- Agent UIs (like the CXDB frontend itself) cannot show streaming text. The `StreamingIndicator` component exists in the frontend (`frontend/components/live/StreamingIndicator.tsx`) but has no server-side data to display.
- Agents that crash mid-generation lose the partial output entirely. There is no "draft" or "pending" turn.

This is architecturally challenging because the content-addressed blob model (BLAKE3 hash as identity) requires knowing the full content before storing. Possible approaches:

- a) Ephemeral streaming channel: a side-channel (SSE or WebSocket) that streams partial turn content tagged with a pending turn ID. When the turn is finalized, the append commits the full content as usual. Partial content is never persisted.
- b) Chunked append: allow appending turn "chunks" that are assembled into a final blob on commit. The turn is not queryable until committed.
- c) Status field on turns: add a `status` field (pending/streaming/complete) to turn records. Pending turns have a temporary blob that gets replaced on completion.

---

### 10) High: Cross-context coordination is absent — agents spawn sub-agents

Agentic workloads are rarely single-context. A coding agent spawns a test-runner agent. A research agent spawns three parallel search agents. A planning agent forks into exploration branches. These relationships exist in CXDB's data model (`provenance.parent_context_id`, `provenance.spawn_reason`, fork lineage) but are not queryable or navigable.

Evidence:

- `Provenance` has `parent_context_id`, `spawn_reason`, `root_context_id`: `server/src/store.rs:28-30`
- CQL supports `parent` and `root` fields: `server/src/cql/indexes.rs`
- But there is no operation to "list all children of context X" — CQL can do `parent = X` but this requires knowing to ask
- There is no event when a child context references a parent — the relationship is buried in payload metadata
- No "context group" or "run" concept exists to bundle related contexts

Why this matters:

- An agent orchestrator that spawns 5 sub-agents needs to wait for all of them, collect their results, and handle failures. Currently it must poll each context individually.
- The UI shows a flat list of contexts. There is no tree view showing parent→child relationships, even though the data exists to build one.
- "Show me everything related to this user's request" requires knowing the root context ID and running a CQL query. There is no first-class "trace" or "run" concept.

Possible approaches:

- a) First-class context groups: a `run_id` or `trace_id` that groups related contexts. All contexts in a group appear together in queries and UI.
- b) Server-side parent→children index: automatically index `parent_context_id` from provenance so that "list children of X" is O(1) rather than a full scan.
- c) Lifecycle events for child contexts: when a child context completes/fails, publish an event that the parent can subscribe to.

---

### 11) Medium: Read-after-write consistency across protocol boundaries

An agent writes a turn via binary protocol (`:9009`), then a monitoring system reads it via HTTP (`:9010`). Is the read guaranteed to see the write?

Currently, yes — both protocol handlers share the same `Arc<Mutex<Store>>` and the write completes under the mutex before the response is sent. But this is an implicit guarantee, not a documented one, and it has subtleties:

Evidence:

- Shared store with mutex: `server/src/main.rs:70` (store created), passed to both binary handler and HTTP server
- Binary append holds mutex during write: `server/src/main.rs:261`
- HTTP reads also hold mutex: `server/src/http/mod.rs` (lock acquired per request)
- SSE events are published *after* the store mutex is released: `server/src/main.rs:280-287` — but the store write is committed

Why this matters:

- If the architecture ever moves to separate processes, async replication, or read replicas, this guarantee breaks silently.
- Agent orchestrators that write via binary protocol and read via HTTP (a natural pattern — write from the agent process, read from a dashboard) need to know whether they can trust immediate reads.
- The single-process mutex model also means every read blocks every write and vice versa. Under load, this becomes a bottleneck that matters for agent workloads with many concurrent contexts.

This is not a bug today, but it is an undocumented invariant that should be explicitly stated or explicitly relaxed.

---

### 12) Medium: No turn-level filtering for context retrieval

`GET_LAST` returns the last N turns from a context, walking the parent chain. There is no way to ask for "only tool_result turns" or "only turns after depth 50" or "all turns of type X" without fetching everything and filtering client-side.

Evidence:

- `get_last` walks parent pointers unconditionally: `server/src/turn_store/mod.rs` (get_last implementation)
- `get_before` similarly walks without filtering: `server/src/store.rs:277-302`
- HTTP endpoint accepts `limit` and `before_turn_id` but no `type_id` or `depth_min` filter: `docs/http-api.md:130-142`
- CQL only queries at the context level (which contexts match), not at the turn level (which turns within a context match)

Why this matters:

- Agents managing their own context windows need selective retrieval. "Give me the system prompt and the last 5 user/assistant exchanges, skipping tool calls" is a common pattern. Currently this requires fetching all turns and filtering in the client, which defeats the purpose of server-side pagination.
- Agent-to-agent handoff often needs "give me a summary of what happened" which means fetching specific turn types, not the raw full history.
- As contexts grow to hundreds or thousands of turns (normal for tool-heavy agents), fetching everything becomes expensive.

---

### 13) Medium: Branch status and merge semantics for agent retry/backtrack

The O(1) fork primitive is the right foundation for agent retry and exploration. But there is no way to:

- Mark a branch as abandoned ("this approach failed, I'm trying something else")
- Mark a branch as preferred ("this is the one that worked")
- Merge results from parallel exploration branches back into a parent context

Evidence:

- Fork creates a new context pointing to an existing turn: `server/src/store.rs:175-177`
- No status field on contexts (see Finding #8)
- No merge operation exists in the protocol or store
- The UI shows all contexts equally — no visual distinction between active explorations and dead ends

Why this matters:

- Agents that explore multiple approaches in parallel (a key use case for fork) need to mark which branch succeeded. Without this, a supervisor reviewing the run sees N branches with no indication of which one mattered.
- "Merge" may not mean git-style merge. It could mean "append a summary turn to the parent context with the results from the winning branch." But even this pattern needs a convention or primitive.

---

### 14) Medium: The ConversationItem type is doing too much

`cxdb.ConversationItem` (v3) is a single type that covers: user input, assistant turns, tool calls, tool results, system messages, handoffs, and context metadata. This means every turn in every context has the same type ID regardless of what it contains — distinguished only by an `item_type` field inside the payload.

Evidence:

- Single type with item_type discriminator: `clients/rust/src/types/conversation.rs:8-22`
- All item types share the same field tag space (1-30): `clients/rust/src/types/conversation.rs`
- Renderer must dispatch internally on item_type: `frontend/components/ConversationRenderer.tsx`

Why this matters:

- CQL cannot filter by "show me contexts that contain tool failures" because the type_id is always `cxdb.ConversationItem` regardless of content.
- The type registry and projection system are designed around distinct types with their own schemas. A single mega-type that uses a discriminator field bypasses this design.
- This is not necessarily wrong — tagged unions are a valid pattern. But it means the type system can't help with turn-level queries (Finding #12) because all turns look the same from the outside.

The alternative is a type-per-item-type model (`cxdb.UserInput`, `cxdb.AssistantTurn`, `cxdb.ToolCall`, `cxdb.ToolResult`). This would make the type system useful for filtering but would complicate schema evolution. Both approaches have tradeoffs; the current choice should be intentional and documented.

---

### 15) Low: Single-tenant model limits multi-team agent platforms

The architecture doc states "single-tenant model (no per-context ACLs in v1)." Any connected client can read and write any context.

Evidence:

- No auth on binary protocol: `docs/architecture.md:401-403`
- HTTP auth delegated to Go gateway (OAuth), but all authenticated users see all data: `docs/architecture.md:404-405`
- No per-context or per-service isolation in store: `server/src/store.rs`

Why this matters for agents specifically:

- An agent platform running agents for multiple teams/customers needs isolation. Team A's agents should not see Team B's contexts.
- The Go gateway provides authentication (who are you) but not authorization (what can you see).
- This is explicitly out of scope for v1, which is fine. But it should be called out as a scaling constraint for agent platforms, not just a missing feature.

---

## Revised Decision Points

Original decision points (1-6) remain. Additional decisions for agentic workloads:

7. Should HTTP write paths be implemented as the primary accessibility path for agents? (Recommended: yes, this is the highest-impact change for adoption.)
8. How should context lifecycle be modeled — mutable metadata, terminal turns, or both?
9. Should streaming/incremental turns be supported, and if so, via ephemeral channels, chunked appends, or turn status?
10. Should parent→child context relationships be a first-class indexed concept?
11. Should read-after-write consistency be documented as a guarantee or explicitly relaxed?
12. Should turn-level filtering be added to GET_LAST / HTTP reads?
13. Should ConversationItem remain a single discriminated type, or should it be split into per-item-type types?

## Revised Suggested Next Actions

Immediate (unblocks agent adoption):

1. Implement HTTP write paths: `POST /v1/contexts/create`, `POST /v1/contexts/fork`, `POST /v1/contexts/:id/append`. This makes the README Quick Start actually work and opens CXDB to Python/TypeScript agents.
2. Fix type ID canonicalization (Finding #5). Pick dotted form. Fix frontend.
3. Fix depth semantics (Finding #3). Pick 0. Fix docs.

Short-term (makes CXDB useful for agent operations):

4. Add context lifecycle status (active/completed/failed/cancelled) as mutable metadata with a new binary protocol message and HTTP PATCH endpoint.
5. Index parent→child context relationships server-side. Make CQL `parent = X` queries fast.
6. Add turn-level type filtering to GET_LAST and HTTP turn retrieval.

Medium-term (makes CXDB competitive as an agent context store):

7. Implement streaming/incremental turn support.
8. Add context groups / trace IDs as a first-class concept.
9. Implement idempotency (Finding #4) — agents retry, and retry safety is a correctness requirement.
10. Build Python and TypeScript SDK clients (HTTP-based, using the write paths from action #1).

