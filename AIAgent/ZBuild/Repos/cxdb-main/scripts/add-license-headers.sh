#!/usr/bin/env bash
# Add Apache 2.0 SPDX license headers to source files

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Define the license header for different file types
read -r -d '' RUST_HEADER <<'EOF' || true
// Copyright 2025 StrongDM Inc
// SPDX-License-Identifier: Apache-2.0

EOF

read -r -d '' GO_HEADER <<'EOF' || true
// Copyright 2025 StrongDM Inc
// SPDX-License-Identifier: Apache-2.0

EOF

read -r -d '' TS_HEADER <<'EOF' || true
// Copyright 2025 StrongDM Inc
// SPDX-License-Identifier: Apache-2.0

EOF

add_header() {
    local file="$1"
    local header="$2"

    # Check if file already has header
    if head -n 2 "$file" | grep -q "SPDX-License-Identifier: Apache-2.0"; then
        echo "  SKIP (has header): $file"
        return 0
    fi

    # Create temp file with header + original content
    {
        echo -n "$header"
        cat "$file"
    } > "$file.tmp"

    mv "$file.tmp" "$file"
    echo "  ADDED: $file"
}

echo "Adding Apache 2.0 headers to source files..."
echo ""

# Process Rust files
echo "Processing Rust files (.rs)..."
find server clients/rust -name "*.rs" -type f | while read -r file; do
    add_header "$file" "$RUST_HEADER"
done

# Process Go files
echo ""
echo "Processing Go files (.go)..."
find clients/go gateway -name "*.go" -type f 2>/dev/null | while read -r file; do
    add_header "$file" "$GO_HEADER"
done

# Process TypeScript/TSX files
echo ""
echo "Processing TypeScript files (.ts, .tsx)..."
find frontend -name "*.ts" -o -name "*.tsx" -type f 2>/dev/null | while read -r file; do
    # Skip .d.ts files and node_modules
    if [[ "$file" == *".d.ts" ]] || [[ "$file" == *"node_modules"* ]]; then
        continue
    fi
    add_header "$file" "$TS_HEADER"
done

echo ""
echo "Done! Run scripts/check-license-headers.sh to verify."
