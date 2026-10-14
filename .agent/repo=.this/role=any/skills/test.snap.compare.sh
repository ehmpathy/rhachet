#!/usr/bin/env bash
######################################################################
# .what = prove a set of jest snapshot files holds exactly the entries
#         one prior snapshot file held — no entry lost, added, or changed
#
# .why  = a split of one test file into several moves its snapshots into
#         new .snap files via a resnap. a resnap also rewrites what drifted,
#         so the move is only proven when the entries compare equal, byte
#         for byte, to the copy taken before the split
#
# usage:
#   rhx test.snap.compare --before .temp/clone.acceptance.snap.before \
#     --after "blackbox/cli/__snapshots__/clone.acceptance.test.ts.snap blackbox/cli/__snapshots__/clone.list.acceptance.test.ts.snap"
#
# options:
#   --before  the prior .snap file, inside the repo (required)
#   --after   space-separated .snap files, inside the repo (required)
#
# guarantee:
#   - read only
#   - exit 0 = the entry sets are identical; exit 1 = they differ (the
#     differing keys are listed); exit 2 = bad args
######################################################################
set -euo pipefail

BEFORE=""; AFTER=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --before) BEFORE="$2"; shift 2 ;;
    --after) AFTER="$2"; shift 2 ;;
    --skill|--repo|--role) shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done
[[ -n "$BEFORE" && -n "$AFTER" ]] || { echo "--before and --after are required" >&2; exit 2; }
REPO_ROOT="$(git rev-parse --show-toplevel)"
for f in $BEFORE $AFTER; do
  ABS="$(realpath "$f")"
  [[ "$ABS" == "$REPO_ROOT"/* && -f "$ABS" ]] || { echo "not a file inside the repo: $f" >&2; exit 2; }
done

# one entry per record: each `exports[` block, its newlines escaped, so a sort orders whole entries.
#   an entry ends at the line that closes it (`` `; ``), so the file header and the blank lines
#   between entries belong to no entry — a split moves entries across files, never those
asEntries() {
  awk '
    function flush() { if (open) print buf; buf = ""; open = 0 }
    /^exports\[/ { flush(); buf = $0; open = 1; if ($0 ~ /`;$/) flush(); next }
    open { buf = buf "\\n" $0; if ($0 ~ /`;$/) flush() }
    END { flush() }
  ' "$@" | sort
}

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
asEntries "$BEFORE" > "$TMP/before"
# shellcheck disable=SC2086
asEntries $AFTER > "$TMP/after"

COUNT_BEFORE="$(wc -l < "$TMP/before")"
COUNT_AFTER="$(wc -l < "$TMP/after")"
echo "📸 snapshot compare"
echo "   ├─ before: $COUNT_BEFORE entries"
echo "   ├─ after:  $COUNT_AFTER entries"
if cmp -s "$TMP/before" "$TMP/after"; then
  echo "   └─ ✅ identical"
  exit 0
fi
echo "   └─ ✋ differ — the changed lines of each entry that moved:"
echo
# restore each changed entry's newlines, then diff it against its twin of the same key
comm -23 "$TMP/before" "$TMP/after" | awk '{ gsub(/\\n/, "\n"); print }' > "$TMP/gone"
comm -13 "$TMP/before" "$TMP/after" | awk '{ gsub(/\\n/, "\n"); print }' > "$TMP/came"
diff -u "$TMP/gone" "$TMP/came" | tail -n +3 || true
exit 1
