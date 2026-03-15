// Copyright 2025 StrongDM Inc
// SPDX-License-Identifier: Apache-2.0

package proxy

import "embed"

// EmbeddedStatic holds the static frontend assets produced by `next build` (export).
// The assets are copied into gateway/pkg/proxy/web by the Makefile before building.
// The `all:` directive recursively embeds everything under that directory.
//
//go:embed all:web
var EmbeddedStatic embed.FS
