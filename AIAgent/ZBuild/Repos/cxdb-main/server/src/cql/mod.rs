// Copyright 2025 StrongDM Inc
// SPDX-License-Identifier: Apache-2.0

//! CQL (CXDB Query Language) Module
//!
//! A JQL-like query language for searching and filtering CXDB contexts.
//!
//! # Syntax
//!
//! ```text
//! tag = "amplifier"
//! tag = "amplifier" AND user = "jay"
//! (service = "dotrunner" OR service = "gen") AND created > "-7d"
//! service ^= "dot"
//! user ~= "Jay"
//! tag IN ("amplifier", "dotrunner", "gen")
//! NOT tag = "test"
//! ```
//!
//! # Operators
//!
//! | Operator | Meaning | Example |
//! |----------|---------|---------|
//! | `=` | Exact match | `tag = "amplifier"` |
//! | `!=` | Not equal | `service != "test"` |
//! | `^=` | Starts with | `tag ^= "amp"` |
//! | `~=` | Case-insensitive exact | `user ~= "Jay"` |
//! | `^~=` | Case-insensitive prefix | `service ^~= "DOT"` |
//! | `>`, `>=`, `<`, `<=` | Range | `created > "-24h"` |
//! | `IN` | List membership | `tag IN ("a", "b")` |
//! | `NOT` | Negation | `NOT tag = "test"` |
//!
//! # Fields
//!
//! | Field | Type | Description |
//! |-------|------|-------------|
//! | `id` | number | Context ID |
//! | `tag` | string | Client tag |
//! | `title` | string | Context title |
//! | `label` | string | Context labels |
//! | `user` | string | User (on_behalf_of) |
//! | `service` | string | Service name |
//! | `host` | string | Host name |
//! | `trace_id` | string | Trace ID |
//! | `parent` | number | Parent context ID |
//! | `root` | number | Root context ID |
//! | `created` | date | Creation timestamp |
//! | `depth` | number | Head turn depth |
//! | `is_live` | boolean | Has active SSE connections |

pub mod ast;
pub mod executor;
pub mod indexes;
pub mod parser;

pub use ast::{CqlError, CqlQuery, Expression, FieldName, Operator, Value};
pub use executor::execute;
pub use indexes::{IndexStats, SecondaryIndexes};
pub use parser::parse;
