// Copyright 2025 StrongDM Inc
// SPDX-License-Identifier: Apache-2.0

use std::fs::OpenOptions;
use std::io::{Seek, SeekFrom, Write};

use cxdb_server::blob_store::BlobStore;
use cxdb_server::error::StoreError;

#[test]
fn get_returns_corrupt_when_index_lengths_mismatch_pack_header() {
    let dir = tempfile::tempdir().expect("tempdir");

    let payload = b"blob payload used to validate index/header length checks";
    let hash = *blake3::hash(payload).as_bytes();

    {
        let mut store = BlobStore::open(dir.path()).expect("open blob store");
        store
            .put_if_absent(hash, payload)
            .expect("write blob to populate idx + pack");
    }

    // Corrupt blobs.idx: stored_len is at byte offset 44 in each index entry
    // layout = hash(32) + offset(8) + raw_len(4) + stored_len(4) + ...
    let mut idx = OpenOptions::new()
        .read(true)
        .write(true)
        .open(dir.path().join("blobs.idx"))
        .expect("open idx");
    idx.seek(SeekFrom::Start(44)).expect("seek stored_len");
    idx.write_all(&1u32.to_le_bytes())
        .expect("overwrite stored_len");
    idx.sync_all().expect("sync idx");

    let store = BlobStore::open(dir.path()).expect("reopen blob store");
    let err = store.get(&hash).expect_err("expected corruption error");
    assert!(
        matches!(err, StoreError::Corrupt(_)),
        "expected corruption error, got {err:?}"
    );
}
