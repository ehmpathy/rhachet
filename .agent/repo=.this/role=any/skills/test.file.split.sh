#!/usr/bin/env bash
######################################################################
# .what = move a line range of a test file into a new test file that
#         shares the source's header (imports + top-level helpers + the
#         opening describe), then drop that range from the source
#
# .why  = jest runs one FILE in one worker, so a single huge suite sets
#         the floor on parallel wall time; a split by given-block lets
#         its cases run on separate workers. a tool keeps the move exact
#         and reviewable, where a hand copy of 1000 lines is neither
#
# usage:
#   rhx test.file.split --file blackbox/cli/clone.acceptance.test.ts \
#     --header 1-71 --range 1093-1629 --into blackbox/cli/clone.list.acceptance.test.ts
#
# options:
#   --file    the source test file, inside the repo (required)
#   --header  line range copied verbatim to the top of the new file; it
#             must end with the opening `describe(` line (required)
#   --range   line range moved out of the source (required)
#   --into    the new test file; must not exist (required)
#
# guarantee:
#   - the new file = header + range + a closing `});`
#   - the source loses exactly the range; every other line is kept
#   - unused imports are left for the linter to name; trim them after
#   - exit 2 on bad args, a path outside the repo, or an extant --into
######################################################################
set -euo pipefail

FILE=""; HEADER=""; RANGE=""; INTO=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --file) FILE="$2"; shift 2 ;;
    --header) HEADER="$2"; shift 2 ;;
    --range) RANGE="$2"; shift 2 ;;
    --into) INTO="$2"; shift 2 ;;
    --skill|--repo|--role) shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done
for v in FILE HEADER RANGE INTO; do
  [[ -n "${!v}" ]] || { echo "--${v,,} is required" >&2; exit 2; }
done

REPO_ROOT="$(git rev-parse --show-toplevel)"
FILE_ABS="$(realpath "$FILE")"
INTO_ABS="$(realpath -m "$INTO")"
[[ "$FILE_ABS" == "$REPO_ROOT"/* && "$INTO_ABS" == "$REPO_ROOT"/* ]] || { echo "paths must sit inside the repo" >&2; exit 2; }
[[ -f "$FILE_ABS" ]] || { echo "file not found: $FILE" >&2; exit 2; }
[[ ! -e "$INTO_ABS" ]] || { echo "--into already exists: $INTO" >&2; exit 2; }

parse() { [[ "$1" =~ ^([0-9]+)-([0-9]+)$ ]] || { echo "bad range: $1" >&2; exit 2; }; echo "${BASH_REMATCH[1]} ${BASH_REMATCH[2]}"; }
read -r H1 H2 <<< "$(parse "$HEADER")"
read -r R1 R2 <<< "$(parse "$RANGE")"
(( R1 > H2 && R2 >= R1 )) || { echo "--range must sit after --header" >&2; exit 2; }

{
  awk -v a="$H1" -v b="$H2" 'NR >= a && NR <= b' "$FILE_ABS"
  awk -v a="$R1" -v b="$R2" 'NR >= a && NR <= b' "$FILE_ABS"
  echo '});'
} > "$INTO_ABS"

TMP="$(mktemp "$FILE_ABS.split.XXXXXX")"
awk -v a="$R1" -v b="$R2" 'NR < a || NR > b' "$FILE_ABS" > "$TMP"
mv -f "$TMP" "$FILE_ABS"

echo "🌿 split"
echo "   ├─ moved: lines $R1-$R2 ($(( R2 - R1 + 1 )) lines)"
echo "   ├─ into: $INTO ($(wc -l < "$INTO_ABS") lines)"
echo "   └─ source: $FILE ($(wc -l < "$FILE_ABS") lines)"
