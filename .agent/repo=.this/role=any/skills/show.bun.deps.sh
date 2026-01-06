#!/usr/bin/env bash
######################################################################
# .what = show bundled dependencies ordered by file count
# .why = identify which packages contribute most to bundle size
#
# usage:
#   ./.agent/repo=.this/role=any/skills/show.bun.deps.sh
#   ./.agent/repo=.this/role=any/skills/show.bun.deps.sh --top 10
#   ./.agent/repo=.this/role=any/skills/show.bun.deps.sh --entry ./src/other.ts
######################################################################

set -euo pipefail

# defaults
ENTRY="./src/contract/cli/invoke.bun.entry.ts"
TOP=30
OUTDIR="/tmp/rhachet-bundle"

# parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --entry) ENTRY="$2"; shift 2 ;;
    --top) TOP="$2"; shift 2 ;;
    --outdir) OUTDIR="$2"; shift 2 ;;
    *) echo "unknown arg: $1"; exit 1 ;;
  esac
done

# ensure output dir exists
mkdir -p "$OUTDIR"

echo "[show.bun.deps] entry: $ENTRY"
echo "[show.bun.deps] build with sourcemap..."

# build with sourcemap
./node_modules/.bin/bun build "$ENTRY" --outdir "$OUTDIR" --sourcemap=linked --target bun 2>&1

JSFILE=$(ls "$OUTDIR"/*.js 2>/dev/null | head -1)
MAPFILE="${JSFILE}.map"

if [[ ! -f "$MAPFILE" ]]; then
  echo "[show.bun.deps] error: sourcemap not found at $MAPFILE"
  exit 1
fi

echo ""
echo "[show.bun.deps] sourcemap analysis..."
echo ""

# extract total source count
TOTAL=$(cat "$MAPFILE" | jq '.sources | length')
echo "total sources: $TOTAL"
echo ""

# extract package file counts
echo "top $TOP packages by file count:"
echo "─────────────────────────────────────────────────────"
printf "%-6s  %s\n" "FILES" "PACKAGE"
echo "─────────────────────────────────────────────────────"

cat "$MAPFILE" \
  | jq -r '.sources[]' \
  | grep 'node_modules/.pnpm/' \
  | grep -oE 'node_modules/\.pnpm/[^/]+' \
  | sort \
  | uniq -c \
  | sort -rn \
  | head -"$TOP" \
  | while read count pkg; do
      # clean up package name for display
      name=$(echo "$pkg" | grep -oE '[^/]+$')
      printf "%-6s  %s\n" "$count" "$name"
    done

echo "─────────────────────────────────────────────────────"
echo ""

# show local source count
LOCAL=$(cat "$MAPFILE" | jq -r '.sources[]' | grep -v node_modules | wc -l)
echo "local sources (non-node_modules): $LOCAL"
echo ""

# check for duplicate package versions
echo "duplicate package versions:"
echo "─────────────────────────────────────────────────────"
cat "$MAPFILE" \
  | jq -r '.sources[]' \
  | grep 'node_modules/.pnpm/' \
  | grep -oE 'node_modules/\.pnpm/[^/]+' \
  | grep -oE '[^/]+$' \
  | grep -oE '^[^@]+@[^@]+|^@[^@]+@[^@]+' \
  | sort \
  | uniq \
  | grep -oE '^[^@]+|^@[^/]+' \
  | sort \
  | uniq -c \
  | sort -rn \
  | awk '$1 > 1 {print $1 " versions: " $2}'

echo ""
