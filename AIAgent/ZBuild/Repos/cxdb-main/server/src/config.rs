// Copyright 2025 StrongDM Inc
// SPDX-License-Identifier: Apache-2.0

use std::env;
use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct Config {
    pub data_dir: PathBuf,
    pub bind_addr: String,
    pub http_bind_addr: String,
    /// Maximum concurrent binary protocol connections. 0 = unlimited.
    pub max_connections: usize,
    /// Read timeout for binary protocol connections in seconds.
    pub connection_read_timeout_secs: u64,
    /// Write timeout for binary protocol connections in seconds.
    pub connection_write_timeout_secs: u64,
}

impl Config {
    pub fn from_env() -> Self {
        let data_dir = env::var("CXDB_DATA_DIR").unwrap_or_else(|_| "./data".to_string());
        let bind_addr = env::var("CXDB_BIND").unwrap_or_else(|_| "127.0.0.1:9009".to_string());
        let http_bind_addr =
            env::var("CXDB_HTTP_BIND").unwrap_or_else(|_| "127.0.0.1:9010".to_string());
        let max_connections = env::var("CXDB_MAX_CONNECTIONS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(512);
        let connection_read_timeout_secs = env::var("CXDB_CONNECTION_READ_TIMEOUT_SECS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(300);
        let connection_write_timeout_secs = env::var("CXDB_CONNECTION_WRITE_TIMEOUT_SECS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(30);
        Self {
            data_dir: PathBuf::from(data_dir),
            bind_addr,
            http_bind_addr,
            max_connections,
            connection_read_timeout_secs,
            connection_write_timeout_secs,
        }
    }
}
