#!/bin/bash
######################################################################
# .what = list EVERY clock time the husky timestamp check would refuse,
#         across every staged file, not just the first
#
# .why  = .husky/check.timestamps.sh halts on the first hit, so a large
#         commit takes one refused commit per hit. this lists all of them
#         at once, with the same pattern, so the set is fixed in one pass
#
# usage:
#   rhx timestamps.staged.scan
#   rhx timestamps.staged.scan --help
#
# guarantee:
#   - reads the pattern from .husky/check.timestamps.sh, so it never drifts
#   - read-only: scans staged blobs, writes naught
#   - exit 0 = no hits, exit 2 = hits listed, exit 1 = malfunction
######################################################################
set -eu

# help on demand; other args are rhx's own passthrough flags, and this skill takes none
for arg in "$@"; do
  if [ "$arg" = "--help" ] || [ "$arg" = "-h" ]; then
    echo "rhx timestamps.staged.scan — list every staged clock time the husky timestamp check refuses"
    echo "   ├─ usage = rhx timestamps.staged.scan"
    echo "   └─ exit = 0 none, 2 hits listed, 1 malfunction"
    exit 0
  fi
done

# load the pattern from the hook itself, so the two never drift
HOOK=".husky/check.timestamps.sh"
if [ ! -f "$HOOK" ]; then
  echo "💥 MalfunctionError: $HOOK not found; run from the repo root" >&2
  exit 1
fi
eval "$(grep -E '^(CLOCK_COLON|CLOCK_DASH|ZONE|TIMESTAMP_PATTERN|DURATION_PATTERN)=' "$HOOK")"

# scan each staged file the hook scans, and list every hit
hits=0
staged=$(git -c core.quotepath=off diff --cached --name-only --diff-filter=ACM)
while IFS= read -r file; do
  [ -n "$file" ] || continue
  case "$file" in
    *.ts | *.sh) continue ;;
  esac
  content=$(git show ":$file")
  found=$(printf '%s\n' "$content" | sed -E "s/$DURATION_PATTERN//g" | grep -nIE "$TIMESTAMP_PATTERN" || true)
  if [ -n "$found" ]; then
    while IFS= read -r line; do
      echo "$file:$line"
      hits=$((hits + 1))
    done <<HITS
$found
HITS
  fi
done <<EOF
$staged
EOF

# report the tally
if [ "$hits" -eq 0 ]; then
  echo "🐢 no staged timestamps"
  exit 0
fi
echo "✋ $hits staged timestamps" >&2
exit 2
