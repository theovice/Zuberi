# Store Service (Rust) — Layout Stub

This directory will host the Rust service implementing the Turn DAG + Blob CAS store
and the HTTP/JSON read gateway described in NEW_SPEC.md and CLIENT_SPEC.md.

Planned module areas (stubs only for now):

- src/blob_store/      Blob CAS (pack + index), compression, hashing
- src/turn_store/      Turn records, heads table, indexing, recovery
- src/registry/        Type registry ingestion + validation
- src/protocol/        Binary framing + message handlers
- src/http/            JSON gateway (typed/raw views)
- src/projection/      Msgpack decoding + typed projection

No implementation yet.
