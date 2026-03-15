# Storage Format (v1)

Data lives under `CXDB_DATA_DIR` (default `./data`) with two subdirectories:

- `blobs/`
  - `blobs.pack` append-only blob records
  - `blobs.idx` hash → pack offset index
- `turns/`
  - `turns.log` append-only Turn records
  - `turns.idx` TurnID → offset index
  - `turns.meta` declared type + encoding metadata
  - `heads.tbl` append-only context head updates

## Blob records (`blobs.pack`)

```
BlobRecord {
  magic: u32 = 0x42534C42  // 'B''S''L''B'
  version: u16 = 1
  codec: u16              // 0=none, 1=zstd
  raw_len: u32
  stored_len: u32
  hash: [32]              // BLAKE3-256
  stored_bytes: [stored_len]
  crc32: u32              // over header+stored_bytes
}
```

Index entries (`blobs.idx`) are fixed-size:

```
BlobIndexEntry {
  hash: [32]
  pack_offset: u64
  raw_len: u32
  stored_len: u32
  codec: u16
  reserved: u16
}
```

## Turn records (`turns.log`)

Fixed-size records with CRC for recovery:

```
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

Index entries (`turns.idx`) are fixed-size:

```
TurnIndexEntry {
  turn_id: u64
  offset: u64
}
```

## Turn metadata (`turns.meta`)

Variable-length records keyed by `turn_id`:

```
TurnMeta {
  turn_id: u64
  declared_type_id_len: u32
  declared_type_id: [bytes]
  declared_type_version: u32
  encoding: u32
  compression: u32
  uncompressed_len: u32
}
```

## Context heads (`heads.tbl`)

Append-only records, last write wins on load:

```
ContextHeadRecord {
  context_id: u64
  head_turn_id: u64
  head_depth: u32
  flags: u32
  created_at_unix_ms: u64
  crc32: u32
}
```

## Durability

All write operations use `sync_all()` (fsync) after each file write. This ensures
data is flushed from the OS page cache to stable storage before the server
acknowledges the write to the client. The sync order for an append is:

1. `blobs.pack` + `blobs.idx` (blob data and index)
2. `turns.log` (turn record)
3. `turns.idx` (turn index)
4. `turns.meta` (type metadata)
5. `heads.tbl` (context head update)

A crash at any point leaves files in a recoverable state: CRC checks on startup
detect and truncate partial writes.

## Recovery

On startup the store scans logs sequentially. If a trailing record fails CRC or is incomplete,
files are truncated to the last valid position.
