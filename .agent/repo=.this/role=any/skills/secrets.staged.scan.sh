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

# the call as the human typed it, for each refusal to echo: rhx prepends `--skill <name>`, which
#   the human never typed, so that pair is dropped
TYPED=()
DROP_NEXT="false"
for arg in "$@"; do
  if [ "$DROP_NEXT" = "true" ]; then DROP_NEXT="false"; continue; fi
  if [ "$arg" = "--skill" ]; then DROP_NEXT="true"; continue; fi
  TYPED+=("$arg")
done
INVOCATION="rhx secrets.staged.scan${TYPED[*]:+ ${TYPED[*]}}"

# help on demand. the only other args are rhx's own `--skill <name>` passthrough; this skill
#   takes no args of its own, so any other one is refused rather than silently ignored
SKIP_NEXT="false"
for arg in "$@"; do
  if [ "$SKIP_NEXT" = "true" ]; then SKIP_NEXT="false"; continue; fi
  case "$arg" in
    --help|-h)
      echo "rhx secrets.staged.scan — list every staged secret key shape the husky secrets check refuses"
      echo "   ├─ usage = rhx secrets.staged.scan"
      echo "   └─ exit = 0 none, 2 hits listed, 1 malfunction"
      exit 0
      ;;
    --skill|--repo|--role) SKIP_NEXT="true" ;;
    *)
      echo "✋ ConstraintError: unknown option: $arg" >&2
      echo "   ├─ ran = ${INVOCATION}" >&2
      echo "   └─ see = rhx secrets.staged.scan --help" >&2
      exit 2
      ;;
  esac
done

# load the shapes from the hook itself, so the two never drift
HOOK=".husky/check.secrets.sh"
if [ ! -f "$HOOK" ]; then
  # the caller fixes this — run from the repo root — so it is a constraint, exit 2
  echo "✋ ConstraintError: $HOOK not found" >&2
  echo "   ├─ ran = ${INVOCATION}" >&2
  echo "   ├─ cwd = $(pwd)" >&2
  echo "   └─ fix = run from the repo root" >&2
  exit 2
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
    # grep exits 1 on no match, 2 on a regex that fails to compile; only the latter is a fault,
    #   and it must never read as a clean scan. grep's own complaint differs per grep (gnu vs
    #   bsd), so it is dropped; the message below names the fault on every host
    set +e
    matched=$(printf '%s\n' "$content" | grep -nIE -e "$regex" 2>/dev/null)
    code=$?
    set -e
    if [ "$code" -gt 1 ]; then
      echo "💥 MalfunctionError: the shape '$name' from $HOOK did not compile as a regex" >&2
      echo "   └─ fix = repair that shape in $HOOK" >&2
      exit 1
    fi
    lines=$(printf '%s\n' "$matched" | cut -d: -f1)
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
echo "✋ ConstraintError: $hits staged secret key shapes" >&2
echo "   └─ fix = remove each, and rotate any key that ever left this machine; a test key composes via asTestKeyText" >&2
exit 2
