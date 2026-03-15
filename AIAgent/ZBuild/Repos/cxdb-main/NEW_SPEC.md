# AI Context Store v1 — Turn DAG + Blob CAS (Implementation-Ready)

This spec defines a **service-oriented**, **append-dominant** storage system for AI conversation/tool context with:

- **Fast append**
- **Branch-from-any-turn** (multiple trajectories)
- **Fast retrieval**: last _N_, full replay, and paging by turn-count/range
- **Blob-level dedup** across contexts (“families”) via content addressing
- **Flexible types** defined by the calling software (service stores opaque bytes)

This design intentionally does **not** expose a general “structural graph” API to clients. The fundamental abstraction is a **Turn DAG** plus a **content-addressed blob store**.

---

## 0) Non-Goals (v1)

v1 does **not**:

- Provide a query language (no Mongo-like queries)
- Provide distributed consensus or replication
- Provide cross-tenant isolation (single-tenant assumption)
- Attempt semantic dedup (e.g., “JSON equivalent after normalization”)
- Deduplicate within blobs (sub-chunk dedup) — reserved for v2
- Guarantee “restful” HTTP semantics; API is binary frames over a persistent connection

v1 **does**:

- Provide deterministic retrieval for a specific branch/head
- Support branching efficiently (no copying of history)
- Deduplicate identical payload blobs across all contexts
- Support rare **edit/delete** via overlays (optional) or branch-as-edit (recommended)

---

## 1) Workload Assumptions (Explicit)

1) Writes are mostly **append new turn**, occasionally **fork from previous turn**, rarely **edit/delete**.
2) Typical payload size is ~10KB; occasionally up to ~1MB (e.g., PNGs).
3) Reads are mostly:
   - **Last N turns**
   - **Full history** (root → head)
   - **Paging** (turn-count/range)
4) Single tenant, but **many concurrent agents**:
   - Dozens simultaneous active contexts
   - Thousands total contexts/day
5) Payload bytes are produced by the caller’s best struct serialization; the store treats them as **opaque** but expects **deterministic encoding** for effective dedup.

---

## 2) Architectural Options (Summary)

### Option A (Recommended): Turn DAG + Blob CAS

- Immutable Turn nodes form a parent-pointer DAG (a tree per branch/head).
- All payload bytes are stored in a content-addressed blob store keyed by hash.
- Branching is constant time: create a new head pointer referencing an existing turn.

### Option B: Append-only OpLog + Compacted Segments

- Store `AppendTurn`, `Fork`, `Patch`, etc. as events.
- Background compaction builds read-optimized segments and indices.
- Best when you expect high-frequency incremental updates (e.g., streaming tokens), but more moving parts.

### Option C: “RSDS” Structural Store as substrate

- Use a general object-graph delta store and implement “turn append” as a macro op.
- Powerful, but unnecessary overhead if you mostly append and only need branch + slice.

**v1 chooses Option A.** v2 may optionally add B-style segment compaction for incremental patches.

---

## 3) Core Model

### 3.1 Identifiers

```text
TurnID    := u64   // monotonically increasing, globally unique within the store
ContextID := u64   // random/opaque (or monotonic), identifies a trajectory/head pointer
BlobHash  := [32]  // BLAKE3-256 (recommended) or SHA-256
TypeTag   := u64   // e.g., hash of fully qualified type name
CodecTag  := u32   // enum: GoProtobuf, GoGob, FlatBuffers, Capnp, Cbor, Json, RawBytes, ...
```

### 3.2 Turn node (immutable)

A Turn is an immutable record:

```text
Turn {
  turn_id: TurnID
  parent_turn_id: TurnID   // 0 = none/root
  depth: u32               // parent.depth + 1, root depth = 0
  type_tag: TypeTag
  codec: CodecTag
  payload_hash: BlobHash
  flags: u32               // reserved for delete/tombstone, overlay presence, etc.
  created_at_unix_ms: u64  // optional
}
```

**Invariants**

1) `turn_id` is unique and never reused.
2) `parent_turn_id` is either `0` or references an earlier Turn.
3) `depth` is consistent with parent linkage.
4) A Turn’s `payload_hash` refers to an immutable blob in the blob store.

### 3.3 Context (branch head)

A Context is a mutable pointer to a Turn:

```text
ContextHead {
  context_id: ContextID
  head_turn_id: TurnID
  head_depth: u32
  created_at_unix_ms: u64
  flags: u32
}
```

Contexts form a “family” implicitly by sharing blobs; **no explicit family construct is required** for v1.

---

## 4) Blob Store (Content-Addressed Storage)

### 4.1 Blob semantics

- A blob is identified by `BlobHash = Hash(payload_bytes)`.
- The store MUST deduplicate: if `BlobHash` exists, store no additional copy.
- The store MAY compress blobs before writing; it MUST record codec+length to decode.

### 4.2 Recommended hashing

- Use **BLAKE3-256** for speed and security margin.
- Hash input MUST be exactly the payload bytes as received (after optional canonicalization by the client).

### 4.3 Compression policy (v1)

- Default codec: `Zstd(level=1..3)` for 10KB-ish payloads.
- For incompressible data (e.g., PNG), store raw (codec=`None`) when `compressed_len >= raw_len`.
- Store both `raw_len` and `stored_len`.

### 4.4 Blob physical layout

v1 uses packfiles + an index:

- `blobs.pack` (append-only)
- `blobs.idx` (hash → location)

Blob record in `blobs.pack`:

```text
BlobRecord {
  magic: u32 = 0x42534C42  // 'B''S''L''B'
  version: u16 = 1
  codec: u16
  raw_len: u32
  stored_len: u32
  hash: BlobHash
  stored_bytes: [stored_len]
  crc32: u32               // over header+stored_bytes (excluding crc32)
}
```

**Index entry**

```text
BlobIndexEntry {
  hash: BlobHash
  pack_offset: u64
  raw_len: u32
  stored_len: u32
  codec: u16
  reserved: u16
}
```

Implementation note: `blobs.idx` can be implemented as:
- an embedded KV store, or
- a custom hash table file, or
- a sorted table with periodic sparse index (mmap-friendly).

---

## 5) Turn Store (Metadata)

### 5.1 Physical layout

v1 uses:

- `turns.log` (append-only Turn records)
- `turns.idx` (TurnID → file offset)
- `heads.tbl` (ContextID → current head)

Turn record in `turns.log` (fixed-size, little-endian):

```text
TurnRecordV1 {
  turn_id: u64
  parent_turn_id: u64
  depth: u32
  codec: u32
  type_tag: u64
  payload_hash: [32]
  flags: u32
  created_at_unix_ms: u64
  crc32: u32
}
```

### 5.2 Durability and crash safety

The service MUST guarantee:

- A Turn is never visible through a head pointer unless its record is durable.
- A head update is atomic (or recoverable) per context.

Recommended write ordering for `AppendTurn`:

1) Ensure blob exists in blob store (write blob if missing).
2) Append `TurnRecordV1` to `turns.log`.
3) Update `turns.idx`.
4) Update `heads.tbl` for the target context.

Crash recovery MUST tolerate:

- Partial last record in `turns.log` (truncate to last valid crc).
- Head table corruption (rebuild from head WAL or last-known snapshot).

---

## 6) Service API (Binary, Dense)

The service protocol is a persistent connection with length-prefixed frames.

### 6.1 Frame format

```text
FrameHeader {
  len: u32        // payload bytes
  msg_type: u16
  flags: u16
  req_id: u64
}
payload: [len]
```

All fields are little-endian.

### 6.2 Core messages (v1)

Minimal message set for your workload:

- `HELLO`
- `CTX_CREATE` (new empty context from a base turn OR from “no parent”)
- `CTX_FORK` (new context whose head is an existing turn)
- `GET_HEAD`
- `APPEND_TURN` (append to a context head; optionally specify parent TurnID)
- `GET_LAST` (last N turns from head)
- `GET_BEFORE` (page older turns using cursor)
- `GET_RANGE_BY_DEPTH` (optional, for direct range)
- `GET_BLOB` (fetch payload bytes by hash)

### 6.3 Recommended retrieval contract

To keep paging fast without random access:

- Prefer cursor-style paging:
  - `GET_LAST(context, limit) -> turns[], next_cursor_turn_id`
  - `GET_BEFORE(context, before_turn_id, limit) -> turns[], next_cursor_turn_id`

Depth-range paging is supported but may be O(delta) without additional ancestor indices.

---

## 7) Retrieval Semantics

### 7.1 “Resume from a TurnID”

Given a `turn_id`, the service returns the full ordered chain:

```text
root → … → turn_id
```

Algorithm:

1) Load TurnRecord for `turn_id`.
2) Follow `parent_turn_id` until 0, collecting records.
3) Reverse and return.

### 7.2 “Last N turns”

Given a `context_id` and `N`:

1) Load head_turn_id from `heads.tbl`.
2) Walk parents up to N steps.
3) Reverse to chronological order.

### 7.3 Paging (recommended)

Cursor paging uses the `before_turn_id` of the oldest turn returned previously.

- Complexity is O(page_size).
- Works naturally with branches and does not require random access by depth.

### 7.4 Turn-count/range paging

If you require `[start_depth, end_depth)`:

Inputs:
- `context_id`, `start_depth`, `limit`
- Service returns:
  - `head_depth`
  - turns for the depth window (chronological)

Implementation:

- If `start_depth` is near `head_depth`, walking parents is cheap.
- If frequent deep random access is required, add **optional v2** “skip pointers” or periodic jump table.

---

## 8) Edit/Delete Semantics

v1 supports two models. Pick one per deployment; both can coexist.

### 8.1 Branch-as-edit (recommended)

Edits are represented by forking and appending corrected turns. No history mutation.

- Pros: simplest, preserves auditability.
- Cons: “latest view” may require choosing the correct branch.

### 8.2 Overlay patches (optional, for redaction/compliance)

Maintain a small overlay log:

```text
Patch {
  target_turn_id: TurnID
  new_payload_hash: BlobHash
  flags: u32 // patch vs tombstone
  seq: u64   // monotonic overlay sequence
}
```

Retrieval modes:
- **As-of**: apply only patches with `seq <= requested`.
- **Latest**: apply all patches.

Blob refcounts MUST account for patches (increment new blob, decrement old blob when safe).

---

## 9) Concurrency Model

Single tenant, many concurrent contexts.

Service MUST guarantee:

- TurnID allocation is linearizable (single sequencer).
- Head updates are linearizable per context (per-context lock).
- Blobs are deduplicated safely under contention (double-checked insert on `blobs.idx`).

Recommended locking strategy:

- One global `turn_id` atomic counter.
- Per-context mutex for head updates.
- Blob index uses sharded locks by hash prefix.

---

## 10) Performance Targets (v1)

On a single machine (SSD), per process:

- AppendTurn: p50 < 1ms for 10KB payloads, p99 < 10ms under moderate load
- GET_LAST (N<=64): p50 < 1ms from warm cache
- Blob dedup check: O(1) expected (hash table index)

Memory:

- Keep a small LRU of recent turns and decompressed blobs (configurable).

---

## 11) v2 Enhancements (Not in v1)

1) **Sub-blob dedup** (content-defined chunking + chunk CAS) for “substantially similar” tool results.
2) **Incremental turn updates**: `AppendTextDelta` and background coalescing into a sealed blob.
3) **Read-optimized segments** (Option B) for very deep histories and cold-cache speed.
4) **Skip pointers / jump tables** for O(log N) ancestor queries by depth.
5) **Canonicalization hooks** per codec to improve dedup (e.g., deterministic protobuf, canonical CBOR).

