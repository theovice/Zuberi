#!/usr/bin/env bash
# Check that all source files have Apache 2.0 SPDX license headers

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

MISSING=()
CHECKED=0

check_file() {
    local file="$1"
    CHECKED=$((CHECKED + 1))

    if ! head -n 2 "$file" | grep -q "SPDX-License-Identifier: Apache-2.0"; then
        MISSING+=("$file")
    fi
}

echo "Checking Apache 2.0 headers in source files..."
echo ""

# Check Rust files
echo "Checking Rust files (.rs)..."
if [ -d server ] || [ -d clients/rust ]; then
    find server clients/rust -name "*.rs" -type f 2>/dev/null | while read -r file; do
        check_file "$file"
    done
fi

# Check Go files
echo "Checking Go files (.go)..."
if [ -d clients/go ] || [ -d gateway ]; then
    find clients/go gateway -name "*.go" -type f 2>/dev/null | while read -r file; do
        check_file "$file"
    done
fi

# Check TypeScript/TSX files
echo "Checking TypeScript files (.ts, .tsx)..."
if [ -d frontend ]; then
    find frontend -name "*.ts" -o -name "*.tsx" -type f 2>/dev/null | while read -r file; do
        # Skip .d.ts files and node_modules
        if [[ "$file" == *".d.ts" ]] || [[ "$file" == *"node_modules"* ]]; then
            continue
        fi
        check_file "$file"
    done
fi

echo ""
echo "Checked: $CHECKED files"

if [ ${#MISSING[@]} -eq 0 ]; then
    echo "✓ All source files have Apache 2.0 headers"
    exit 0
else
    echo "✗ Missing headers in ${#MISSING[@]} files:"
    printf '  %s\n' "${MISSING[@]}"
    echo ""
    echo "Run scripts/add-license-headers.sh to fix."
    exit 1
fi
