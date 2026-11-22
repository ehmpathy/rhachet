#!/bin/bash
######################################################################
# .what = list EVERY secret key shape the husky secrets check would refuse,
#         across every staged file, not just the first
#
# .why  = .husky/check.secrets.sh halts on the first hit, so a commit that
#         touches several files with test-key literals takes one refused
#         commit per file. this lists all of them at once, with the same
#         shapes, so the set is fixed in one pass
#
# usage:
#   rhx secrets.staged.scan
#   rhx secrets.staged.scan --help
#
# guarantee:
#   - reads the shapes from .husky/check.secrets.sh, so it never drifts
#   - prints the file, the line, and the shape name — never the key text
#   - read-only: scans staged blobs, writes naught
#   - exit 0 = no hits, exit 2 = hits listed, exit 1 = malfunction
######################################################################
set -eu

# help on demand; other args are rhx's own passthrough flags, and this skill takes none
for arg in "$@"; do
  if [ "$arg" = "--help" ] || [ "$arg" = "-h" ]; then
    echo "rhx secrets.staged.scan — list every staged secret key shape the husky secrets check refuses"
    echo "   ├─ usage = rhx secrets.staged.scan"
    echo "   └─ exit = 0 none, 2 hits listed, 1 malfunction"
    exit 0
  fi
done

# load the shapes from the hook itself, so the two never drift
HOOK=".husky/check.secrets.sh"
if [ ! -f "$HOOK" ]; then
  echo "💥 MalfunctionError: $HOOK not found; run from the repo root" >&2
  exit 1
fi
eval "$(sed -n '/^EDGE=/p' "$HOOK")"
eval "$(sed -n '/^SHAPES="/,/"$/p' "$HOOK")"
if [ -z "${SHAPES:-}" ]; then
  echo "💥 MalfunctionError: no SHAPES block read from $HOOK; the hook's layout changed" >&2
  exit 1
fi

# scan each staged file against each shape, and list every hit (the line number, never the text)
hits=0
staged=$(git -c core.quotepath=off diff --cached --name-only --diff-filter=ACM)
while IFS= read -r file; do
  [ -n "$file" ] || continue
  content=$(git show ":$file")
  while IFS='|' read -r name regex; do
    [ -n "$name" ] || continue
    lines=$(printf '%s\n' "$content" | grep -nIE -e "$regex" | cut -d: -f1 || true)
    for line in $lines; do
      echo "$file:$line [$name]"
      hits=$((hits + 1))
    done
  done <<SHAPES_EOF
$SHAPES
SHAPES_EOF
done <<EOF
$staged
EOF

# report the tally
if [ "$hits" -eq 0 ]; then
  echo "🐢 no staged secret key shapes"
  exit 0
fi
echo "✋ $hits staged secret key shapes" >&2
exit 2
