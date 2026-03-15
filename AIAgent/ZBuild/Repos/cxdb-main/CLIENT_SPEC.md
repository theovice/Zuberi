# Client Spec v1 — Typed Turn Payloads over the Turn DAG Store

This document specifies **client-side responsibilities and APIs** for the **AI Context Store** described in `NEW_SPEC.md`.

The core storage model is:

- **Turn DAG**: immutable turns linked by `parent_turn_id`, with **branch heads** (`context_id → head_turn_id`).
- **Blob CAS**: turn payload bytes deduplicated by `content_hash = BLAKE3(uncompressed_bytes)`.
- **Typed payloads**: payload bytes are **Msgpack** encoded with **numeric field tags**, plus a **declared type hint** captured at write time.
- **Type registry**: authoritative descriptors authored by Go and ingested by Rust, used to project **typed/shaped JSON** for UI and other readers.

This spec covers:

- **Writer**: Go client that publishes registry bundles and appends turns.
- **Readers**:
  - Go reader (server-side): fetches raw bytes and decodes locally
  - JS/TS server-side reader: raw or typed JSON
  - Browser/React client: typed JSON only (safe integer handling, bytes rendering)

---

## 0) Goals / invariants

1) **Dense wire**: Go writes turns as Msgpack blobs with numeric field tags and optional compression.
2) **Type source of truth**: Go defines `TypeID + TypeVersion` and publishes a **Type Registry Bundle**.
3) **Storage is append-only**: Rust persists **raw bytes + declared type hint per turn**. Raw bytes are never mutated.
4) **UI read**: React fetches **typed/shaped JSON** from Rust (projection), derived from raw bytes using the registry.
5) **Type hinting**: On read, clients may:
   - **inherit** the stored declared type hint (default), or
   - **request a projection** using another version of the same `TypeID` (override).
6) **Forward compatibility**: unknown fields are preserved in storage; tags are never reused.

Non-goals (v1):

- Full bidirectional JSON ↔ msgpack round-trip
- Generic cross-language codegen
- Protobuf descriptors (unless you choose protobuf as a codec later)
- Chunk-level dedup inside blobs (v2)

---

## 1) Domain model (anchored to AI context)

### 1.1 Context and turns

- A **context** is a trajectory (branch head) identified by `context_id`.
- A **turn** is an immutable node in the turn DAG identified by `turn_id` and linked to its parent by `parent_turn_id`.
- Branching (“fork from turn X”) creates a new `context_id` whose `head_turn_id = X`.
- Appending adds a new turn whose `parent_turn_id` is the current head (or an explicitly provided parent).

### 1.2 Turn payload

Each turn stores exactly one payload blob plus a declared type hint:

```text
DeclaredTypeRef := { type_id: string, type_version: u32 }
PayloadBytes := Msgpack bytes (optionally compressed on the wire)
```

**Types are defined by the calling software.** For AI context, recommended TypeIDs are things like:

- `com.yourorg.ai.MessageTurn`
- `com.yourorg.ai.ToolCall`
- `com.yourorg.ai.ToolResponse`
- `com.yourorg.ai.ImageAttachment`

but this is purely convention; the store treats payloads as opaque bytes and relies on the registry for projection.

---

## 2) Terminology

- **TypeID**: stable string identifier (never reused), e.g. `com.yourorg.ai.MessageTurn`
- **TypeVersion**: monotonically increasing `u32` per TypeID
- **DeclaredTypeRef**: `{ type_id, type_version }` stored with each turn at write time
- **Registry Bundle**: authoritative descriptors published by Go and ingested by Rust
- **Projection**: JSON view produced by applying a descriptor to msgpack values (coercions for bytes/u64/enums/timestamps)
- **Content hash**: `BLAKE3(uncompressed_msgpack_bytes)`; used as the blob CAS key

---

## 3) Msgpack encoding contract (Go → Rust)

### 3.1 Canonical shape (required)

- Each payload is a msgpack **map** from **field tag** → value.
- Field tag MUST be a msgpack **positive integer** (`uint`).
- Rust MUST also accept **digit-strings** (`"1"`, `"42"`) as tags and normalize to integer (interop tolerance).
- Omitting empty/zero fields (`omitempty`) is allowed.

### 3.2 Deterministic encoding (strongly recommended)

Blob-level dedup is maximized when identical logical values serialize to identical bytes.

Go writer SHOULD produce deterministic msgpack bytes for a given Go value by:

- Encoding payloads as a map whose keys are numeric tags.
- Emitting fields sorted by tag ascending.
- Ensuring maps inside the payload use a deterministic key ordering where feasible.

If strict determinism is not achievable for certain payloads, dedup still works for exact byte matches, but hit rate will be lower.

### 3.3 Allowed value types

- Msgpack primitives: nil, bool, int/uint, str, bin, array, map
- Nested tagged-map objects (preferred)

### 3.4 Forbidden / discouraged

- Array-based “positional structs” for primary objects (breaks unknown-field preservation)
- Field-name string keys (except digit-strings tolerated only for interop)

---

## 4) Type Registry (authored by Go, enforced/distributed by Rust)

### 4.1 Descriptor model (bundle JSON)

Registry bundles are JSON (or msgpack) describing known types and versions:

```json
{
  "registry_version": 1,
  "bundle_id": "2025-12-19T20:00:00Z#abc123",
  "types": {
    "com.yourorg.ai.MessageTurn": {
      "versions": {
        "1": {
          "fields": {
            "1": { "name": "role", "type": "u8", "enum": "com.yourorg.ai.Role" },
            "2": { "name": "text", "type": "string", "optional": true },
            "3": { "name": "tool_call_id", "type": "u64", "optional": true },
            "4": { "name": "attachments", "type": "array", "items": "typed_blob", "optional": true }
          }
        }
      }
    }
  },
  "enums": {
    "com.yourorg.ai.Role": { "1": "system", "2": "user", "3": "assistant", "4": "tool" }
  }
}
```

Field keys are tag numbers (stringified in JSON). Tags MUST be unique per type-version.

### 4.2 Evolution rules (enforced on ingest)

For a given `TypeID`:

- Add a field: allowed (new tag only)
- Remove a field: allowed (descriptor may omit it or mark tombstone)
- Rename a field: allowed (descriptor-only change)
- Change field type: NOT allowed in-place; allocate a new tag (old tag may be tombstoned)
- Reuse a tag: forbidden forever
- `TypeVersion` increments when any descriptor-visible change occurs (including rename/semantic changes)

### 4.3 Registry ingestion

Go publishes bundles to Rust; Rust:

- validates monotonic versioning
- validates tag uniqueness/non-reuse
- validates enum references
- persists bundle + per-type/version descriptors
- makes descriptors available to the decode/projection pipeline immediately

---

## 5) Service APIs

There are two surfaces:

1) **Binary protocol** (persistent connection): used by Go writer and Go/TS server-side readers for high-throughput turn IO.
2) **HTTP/JSON read gateway**: used by browser/React for typed projections and developer tooling.

### 5.1 Binary protocol (writer + server-side readers)

The binary framing is defined in `NEW_SPEC.md` (length-prefixed frames). This spec defines message-level semantics for typed payloads.

#### 5.1.1 Publish registry bundle (low volume)

Writers MAY publish bundles over HTTP (recommended) even if they use binary for turn IO.

If publishing over binary, use:

`REGISTRY_PUT_BUNDLE` payload:

```text
bundle_id_len: u32
bundle_id: [bytes]
bundle_json_len: u32
bundle_json: [bytes]
```

Idempotent by `bundle_id`.

#### 5.1.2 Append a turn (primary write)

`APPEND_TURN` payload:

```text
context_id: u64
parent_turn_id: u64        // 0 means “use current head”

declared_type_id_len: u32
declared_type_id: [bytes]
declared_type_version: u32

encoding: u32              // 1 = msgpack
compression: u32           // 0 = none, 1 = zstd
uncompressed_len: u32
content_hash_b3_256: [32]

payload_len: u32           // bytes as-sent (compressed if compression != none)
payload_bytes: [payload_len]

idempotency_key_len: u32   // optional but recommended
idempotency_key: [bytes]
```

Server behavior:

- Resolves parent:
  - if `parent_turn_id != 0`: append onto that explicit parent (branch-in-place); context head moves to the new turn
  - else: append onto the current context head
- Decompresses if needed, verifies `uncompressed_len`, computes `BLAKE3` and verifies `content_hash`.
- Stores blob in CAS under `content_hash` if missing.
- Appends a new Turn record with declared type hint and updates the context head.

`APPEND_TURN_ACK`:

```text
context_id: u64
new_turn_id: u64
new_depth: u32
content_hash_b3_256: [32]
```

#### 5.1.3 Fork a context

`CTX_FORK` payload:

```text
base_turn_id: u64
```

Response:

```text
new_context_id: u64
head_turn_id: u64
head_depth: u32
```

#### 5.1.4 Get last N turns (server-side reader)

`GET_LAST` payload:

```text
context_id: u64
limit: u32
include_payload: u32   // 0 metadata only, 1 include raw bytes (compressed) + declared type
```

Response returns ordered turns (oldest→newest in the window). Each item contains:

```text
turn_id: u64
parent_turn_id: u64
depth: u32
declared_type_id_len: u32
declared_type_id: [bytes]
declared_type_version: u32
encoding: u32
compression: u32
uncompressed_len: u32
content_hash: [32]
payload_len: u32
payload_bytes: [payload_len] // omitted if include_payload=0
```

Paging uses `GET_BEFORE(context_id, before_turn_id, limit)`.

### 5.2 HTTP/JSON gateway (UI + tooling)

The browser cannot practically consume the binary protocol directly (CORS, framing, streaming), and also needs projection/render options; therefore the store exposes a JSON gateway.

#### 5.2.1 Registry endpoints (Go writer + tooling)

`PUT /v1/registry/bundles/{bundle_id}`

- Body: registry bundle JSON
- Responses:
  - `201 Created` new bundle
  - `204 No Content` identical bundle already present
  - `409 Conflict` illegal evolution (tag reuse, regression)

`GET /v1/registry/bundles/{bundle_id}`

`GET /v1/registry/types/{type_id}/versions/{type_version}`

Caching:

- MUST support `ETag` / `If-None-Match`.

#### 5.2.2 Read turns as typed JSON (React default)

`GET /v1/contexts/{context_id}/turns`

Query:

- `limit=` (default 64)
- `before_turn_id=` (optional, for paging older turns)
- `view=` one of: `typed` (default), `raw`, `both`
- `type_hint_mode=`:
  - `inherit` (default): decode using the stored declared type ref
  - `explicit`: require explicit `as_type_id` and `as_type_version`
  - `latest`: decode using latest known version for the stored `TypeID`
- Overrides (only if mode allows):
  - `as_type_id=...`
  - `as_type_version=...`
- Rendering options:
  - `include_unknown=0|1` (default 0 for UI; 1 for debug)
  - `bytes_render=base64|hex|len_only` (default base64)
  - `u64_format=string|number` (default string)
  - `enum_render=label|number|both` (default label)
  - `time_render=iso|unix_ms` (default iso)

Response for `view=typed`:

```json
{
  "meta": {
    "context_id": "…",
    "head_turn_id": "…",
    "head_depth": 123,
    "registry_bundle_id": "…"
  },
  "turns": [
    {
      "turn_id": "…",
      "parent_turn_id": "…",
      "depth": 120,
      "declared_type": { "type_id": "…", "type_version": 1 },
      "decoded_as": { "type_id": "…", "type_version": 3 },
      "data": { "role": "assistant", "text": "…" },
      "unknown": { "9": 42 }
    }
  ],
  "next_before_turn_id": "…"  // for paging older turns
}
```

Response for `view=raw` includes:

- `content_hash_b3`
- `encoding`
- `compression`
- `bytes_b64` (optional depending on `bytes_format`)
- `uncompressed_len`

---

## 6) Rust decode + projection pipeline (typed view)

For `view=typed`, Rust performs:

1) Fetch Turn record (declared type + blob hash).
2) Load blob bytes from CAS; decompress if needed.
3) Decode msgpack to an intermediate value.
4) Normalize keys: `uint` and digit-string keys → `u64 tag`.
5) Load descriptor based on type hint logic:
   - inherit / latest / explicit
6) Project:
   - tags in payload that exist in descriptor map to `field.name`
   - tags not in descriptor go to `unknown` (optional)
   - missing fields may be omitted or defaulted (future option)
7) Apply rendering options (bytes, u64, enum, time semantics).

Normative defaults:

- `u64` potentially exceeding JS safe integer: render as **string**
- `bytes`: base64 by default
- `semantic=unix_ms`: ISO-8601 string by default
- enums: label if known, else number

---

## 7) Client responsibilities

### 7.1 Go writer responsibilities

1) **Define and version types**:
   - choose stable `TypeID`s
   - manage `TypeVersion` increments
   - assign numeric tags; never reuse tags
2) **Publish registry bundles**:
   - push before using a new type/version (strongly recommended)
3) **Encode payload bytes**:
   - msgpack map keyed by numeric tags
   - deterministic encoding recommended
4) **Hash + compress**:
   - compute `content_hash = BLAKE3(uncompressed_bytes)`
   - optionally zstd compress for the wire
5) **Append**:
   - call `APPEND_TURN` with declared type ref
   - provide an idempotency key for safe retries

Recommended policy toggles:

- If a write references a registry bundle/type version not known to the server:
  - default: server SHOULD accept raw storage (storage-first)
  - strict mode: server rejects with `412 Precondition Failed`

### 7.2 Go reader responsibilities (server-side)

Default read path is `raw`, not `typed JSON`.

- Use binary `GET_LAST` / `GET_BEFORE` with `include_payload=1`.
- For each turn:
  - verify/optionally re-hash if needed
  - decompress
  - decode into the Go struct matching the declared type

Compatibility:

- Go must retain decoders for historical versions used in stored turns, or provide a migration strategy.
- Go should treat unknown tags as preserved/ignored depending on the decoder’s capabilities.

### 7.3 JS/TS server-side reader responsibilities

Two modes:

- **Raw mode**: fetch bytes and decode msgpack in Node (supports BigInt for u64).
- **Typed mode**: call the HTTP/JSON gateway `view=typed` and treat it as a read-model for observability/UI/devtools.

Guidance:

- For model prompting and deterministic reconstruction, prefer raw mode.
- For dashboards and inspection, prefer typed mode.

### 7.4 Browser/React client responsibilities

- Use the HTTP/JSON gateway.
- Default request:
  - `GET /v1/contexts/{id}/turns?view=typed&type_hint_mode=inherit`
- Treat `u64` as string unless explicitly requested otherwise.
- Use paging via `before_turn_id`.

---

## 8) Errors (canonical)

Binary protocol errors are returned as an `ERROR` frame with:

```text
code: u32
detail_len: u32
detail_bytes: [detail_len] // UTF-8 JSON object or plain text
```

HTTP errors:

```json
{ "error": { "code": "...", "message": "...", "details": { } } }
```

Canonical codes:

- `404 NotFound`: context/turn/blob missing
- `409 Conflict`: illegal registry evolution, type hint mismatch, or head CAS conflict (if used)
- `412 PreconditionFailed`: strict registry mode rejects unknown type/version
- `422 MissingTypeHint`: missing declared type and no explicit hint
- `424 FailedDependency`: decode requested but descriptor missing
- `500 DecodeError`: msgpack invalid / decompression failure / corruption (include hash mismatch details)

---

## 9) Notes on “sync every change”

This v1 spec assumes turns are appended as immutable units.

If you need to persist fine-grained incremental updates (e.g., streaming assistant tokens), you have two choices:

1) **Append small turns** (e.g., `AssistantDelta` turns) and merge at read time (simple, but noisy).
2) Add v2 support for `PATCH_TURN` / `APPEND_TEXT_DELTA` with background coalescing (preferred; see `NEW_SPEC.md` v2 list).

