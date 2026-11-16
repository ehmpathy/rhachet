#!/usr/bin/env bash
######################################################################
# .what = move a line range of a file to sit after another line of the
#         same file, every other line kept in place
#
# .why  = given-blocks land out of order as a suite grows; a renumber
#         moves every snapshot key and every citation of a case, where
#         a move keeps both. a tool keeps the move exact and reviewable,
#         where a hand copy of hundreds of lines is neither
#
# usage:
#   rhx test.file.move --file blackbox/cli/keyrack.githubApp.offEc2.acceptance.test.ts \
#     --range 160-420 --after 937
#
# options:
#   --file   the file, inside the repo (required)
#   --range  the line range to move, as A-B (required)
#   --after  the line the range lands after, outside the range;
#            0 places it at the top (required)
#
# guarantee:
#   - the file keeps the same lines, only reordered: the line count and
#     the sorted content are checked equal before the file is replaced
#   - exit 2 on bad args, a path outside the repo, or --after inside --range
######################################################################
set -euo pipefail

FILE=""; RANGE=""; AFTER=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --file) FILE="$2"; shift 2 ;;
    --range) RANGE="$2"; shift 2 ;;
    --after) AFTER="$2"; shift 2 ;;
    --skill|--repo|--role) shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done
for v in FILE RANGE AFTER; do
  [[ -n "${!v}" ]] || { echo "--${v,,} is required" >&2; exit 2; }
done

REPO_ROOT="$(git rev-parse --show-toplevel)"
FILE_ABS="$(realpath "$FILE")"
[[ "$FILE_ABS" == "$REPO_ROOT"/* ]] || { echo "path must sit inside the repo" >&2; exit 2; }
[[ -f "$FILE_ABS" ]] || { echo "file not found: $FILE" >&2; exit 2; }

[[ "$RANGE" =~ ^([0-9]+)-([0-9]+)$ ]] || { echo "bad range: $RANGE" >&2; exit 2; }
R1="${BASH_REMATCH[1]}"; R2="${BASH_REMATCH[2]}"
[[ "$AFTER" =~ ^[0-9]+$ ]] || { echo "bad --after: $AFTER" >&2; exit 2; }
TOTAL="$(wc -l < "$FILE_ABS")"
(( R1 >= 1 && R2 >= R1 && R2 <= TOTAL )) || { echo "range out of bounds: $RANGE (file has $TOTAL lines)" >&2; exit 2; }
(( AFTER < R1 || AFTER > R2 )) || { echo "--after must sit outside --range" >&2; exit 2; }
(( AFTER <= TOTAL )) || { echo "--after out of bounds: $AFTER" >&2; exit 2; }

# emit every line outside the range; emit the range right after line --after
TMP="$(mktemp "$FILE_ABS.move.XXXXXX")"
awk -v a="$R1" -v b="$R2" -v at="$AFTER" '
  NR == FNR { if (FNR >= a && FNR <= b) held[++n] = $0; next }
  FNR == 1 && at == 0 { for (i = 1; i <= n; i++) print held[i] }
  FNR >= a && FNR <= b { next }
  { print }
  FNR == at { for (i = 1; i <= n; i++) print held[i] }
' "$FILE_ABS" "$FILE_ABS" > "$TMP"

# the move must keep every line: same count, same sorted content
if [[ "$(wc -l < "$TMP")" != "$TOTAL" ]] || ! diff -q <(sort "$FILE_ABS") <(sort "$TMP") > /dev/null; then
  rm -f "$TMP"
  echo "move would change the file's lines; aborted" >&2
  exit 1
fi
mv -f "$TMP" "$FILE_ABS"

echo "🌿 moved"
echo "   ├─ lines $R1-$R2 ($(( R2 - R1 + 1 )) lines)"
echo "   ├─ now after original line $AFTER"
echo "   └─ file: $FILE ($TOTAL lines, unchanged count)"
