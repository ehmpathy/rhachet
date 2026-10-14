#!/usr/bin/env bash
######################################################################
# .what = name each named import a file never uses past its import
#
# .why  = biome ignores `blackbox/`, and tsc does not flag an unused
#         import there, so a split or a trim leaves dead imports no
#         gate reports. this names them, so they can be dropped
#
# usage:
#   rhx test.file.unused.imports --file blackbox/cli/clone.list.acceptance.test.ts
#
# options:
#   --file  a .ts file inside the repo (required)
#
# guarantee:
#   - read only; reads `import { a, b as c } from '…'` and `import x from '…'`
#   - an identifier counts as used when it appears as a whole word on any
#     line that is not an import line
#   - exit 0 always on a readable file; exit 2 on bad args
######################################################################
set -euo pipefail

FILE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --file) FILE="$2"; shift 2 ;;
    --skill|--repo|--role) shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done
[[ -n "$FILE" ]] || { echo "--file is required" >&2; exit 2; }
REPO_ROOT="$(git rev-parse --show-toplevel)"
FILE_ABS="$(realpath "$FILE")"
[[ "$FILE_ABS" == "$REPO_ROOT"/* && -f "$FILE_ABS" ]] || { echo "file must exist inside the repo" >&2; exit 2; }

# the import statements, each joined onto one line, and every other line as the body
IMPORTS="$(awk '
  /^import / { buf = $0; open = ($0 !~ /from /); if (!open) { print buf; buf = "" }; next }
  open { buf = buf " " $0; if ($0 ~ /from /) { print buf; buf = ""; open = 0 } }
' "$FILE_ABS")"
BODY="$(awk '
  /^import / { open = ($0 !~ /from /); next }
  open { if ($0 ~ /from /) open = 0; next }
  { print }
' "$FILE_ABS")"

NAMES="$(echo "$IMPORTS" | sed -E 's/^import (type )?//; s/ from .*$//' | tr -d '{}' | tr ',' '\n' \
  | sed -E 's/^\s*type\s+//; s/.*\bas\s+//; s/^\s+|\s+$//g' | awk 'NF')"

UNUSED=()
while read -r name; do
  [[ -z "$name" ]] && continue
  # a here-string, never `echo | grep -q`: grep -q exits at its first match, and under
  #   pipefail the SIGPIPE on echo would read a used name as unused
  grep -qw -- "$name" <<< "$BODY" || UNUSED+=("$name")
done <<< "$NAMES"

echo "🔎 $FILE"
if [[ ${#UNUSED[@]} -eq 0 ]]; then echo "   └─ every import is used"; exit 0; fi
for i in "${!UNUSED[@]}"; do
  [[ $i -eq $(( ${#UNUSED[@]} - 1 )) ]] && echo "   └─ unused: ${UNUSED[$i]}" || echo "   ├─ unused: ${UNUSED[$i]}"
done
