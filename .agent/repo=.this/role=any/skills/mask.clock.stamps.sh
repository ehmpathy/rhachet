#!/usr/bin/env bash
######################################################################
# .what = find, and on apply mask, the clock stamps that
#         .husky/check.timestamps.sh would refuse, before a commit meets it
#
# .why  = the hook halts a commit on any clock time in a tracked file but
#         .ts/.sh, prose included. a yield or a brief that cites a log path
#         (`.log/.../2026-11-15T07-14-37Z`) carries one. this finds each
#         hit in the files git would commit, and swaps it for `<ts>`
#
# usage:
#   rhx mask.clock.stamps --path .behavior/v2026_11_14.my-feature            # plan
#   rhx mask.clock.stamps --path .behavior/v2026_11_14.my-feature --mode apply
#
# guarantee:
#   - scans only files git would commit: tracked, plus untracked not ignored
#   - skips .ts and .sh, as the hook does
#   - uses the hook's own pattern, and strips iso durations (`PT12:30:00`)
#     first as the hook does, so a clean plan means a clean commit
#   - never masks a duration: apply keeps each `P…T…` span whole
#   - apply masks each stamp `<date>T<hh>-<mm>[-<ss>][-<ms>]Z` and each
#     `T<hh>:<mm>[:<ss>]` clock as `<ts>`; a hit it cannot mask is listed
#   - plan by default; exit 0 = clean, 2 = hits found in plan mode
######################################################################

set -euo pipefail

# parse args
SCAN_PATH=""
MODE="plan"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill|--repo|--role) shift 2 ;;
    --path) SCAN_PATH="$2"; shift 2 ;;
    --mode) MODE="$2"; shift 2 ;;
    --help|-h)
      sed -n '2,24p' "$0"
      exit 0
      ;;
    *)
      echo "✋ ConstraintError: unknown argument $1" >&2
      echo "   └─ rhx mask.clock.stamps --path <dir> [--mode plan|apply]" >&2
      exit 2
      ;;
  esac
done
[[ -n "$SCAN_PATH" ]] || {
  echo "✋ ConstraintError: no --path supplied" >&2
  echo "   └─ rhx mask.clock.stamps --path <dir> [--mode plan|apply]" >&2
  exit 2
}
[[ "$MODE" == "plan" || "$MODE" == "apply" ]] || {
  echo "✋ ConstraintError: --mode must be plan or apply" >&2
  exit 2
}

# the hook's own pattern (kept in step with .husky/check.timestamps.sh)
CLOCK_COLON='([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?'
CLOCK_DASH='T([01][0-9]|2[0-3])-[0-5][0-9](-[0-5][0-9])?'
ZONE='(Z|[+-][0-9][0-9]:?[0-9][0-9])?'
TIMESTAMP_PATTERN="(T${CLOCK_COLON}|${CLOCK_DASH}|(^|[^0-9:])${CLOCK_COLON})${ZONE}([^0-9]|$)"

# an iso-8601 duration the hook strips before it scans; never a clock, never masked
DURATION_PATTERN='P([0-9]+[YMWD])*T([0-9]+[HMS])*[0-9][0-9]:[0-9][0-9](:[0-9][0-9])?'

# the masks apply swaps in: a full dash stamp, then a bare T-clock
MASK_DASH='([0-9]{4}-[0-9]{2}-[0-9]{2})?T([01][0-9]|2[0-3])-[0-5][0-9](-[0-5][0-9])?(-[0-9]{3})?Z?'
MASK_COLON='([0-9]{4}-[0-9]{2}-[0-9]{2})?T([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?(\.[0-9]+)?Z?'

# count the lines that hold a clock once durations are stripped, as the hook reads them
count_clock_lines() {
  sed -E "s/$DURATION_PATTERN//g" "$1" | grep -cIE "$TIMESTAMP_PATTERN" || true
}

# mask each stamp as <ts>; a duration matched first at its own position is kept whole, so a
#   T-clock inside a `P…T…` span is never touched (sed has no lookbehind, so perl does the swap)
mask_clock_stamps() {
  MASK_DUR="$DURATION_PATTERN" MASK_DASH="$MASK_DASH" MASK_COLON="$MASK_COLON" \
    perl -pi -e 's/($ENV{MASK_DUR})|(?:$ENV{MASK_DASH})|(?:$ENV{MASK_COLON})/defined $1 ? $1 : "<ts>"/ge' "$1"
}

# list the files git would commit under the path
FILES=$(git ls-files -co --exclude-standard -- "$SCAN_PATH" | grep -vE '\.(ts|sh)$' || true)

# scan each file
HITS=0
LEFT=0
echo "🔭 mask.clock.stamps --mode $MODE"
echo "   ├─ path = $SCAN_PATH"
while IFS= read -r file; do
  [[ -n "$file" && -f "$file" ]] || continue
  count=$(count_clock_lines "$file")
  [[ "$count" -gt 0 ]] || continue
  HITS=$((HITS + count))
  if [[ "$MODE" == "apply" ]]; then
    mask_clock_stamps "$file"
    after=$(count_clock_lines "$file")
    LEFT=$((LEFT + after))
    echo "   ├─ $file ($count masked, $after left)"
    continue
  fi
  echo "   ├─ $file ($count lines)"
done <<EOF
$FILES
EOF

# report the outcome
if [[ "$HITS" -eq 0 ]]; then
  echo "   └─ clean, no clock stamps"
  exit 0
fi
if [[ "$MODE" == "plan" ]]; then
  echo "   └─ $HITS lines hold a clock stamp; rerun with --mode apply to mask them"
  exit 2
fi
if [[ "$LEFT" -gt 0 ]]; then
  echo "   └─ $LEFT lines still hold a clock stamp; mask them by hand"
  exit 2
fi
echo "   └─ every stamp masked as <ts>"
