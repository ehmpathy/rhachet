#!/usr/bin/env bash
######################################################################
# .what = rename several terms across several globs, in one call
#
# .why  = a vocabulary change (edit → mod, edited → modded) is many
#         literal swaps over many globs. sedreplace takes one pair and
#         one glob, and needs a plan before each apply; a shell loop is
#         not paved. this runs the swaps in order, plan then apply.
#
# usage:
#   rhx terms.rename --pair 'edit dir=>mod dir' --pair 'edited=>modded' \
#     --glob 'docs/*.md' --glob 'src/**/*.ts'                 # plan (default)
#   rhx terms.rename ... --mode apply                         # apply
#
# guarantee:
#   - pairs run in the order given, so a later pair sees earlier swaps
#   - each swap is a literal match via sedreplace (repo-bound, gitignore-aware)
#   - plan mode prints only the match count per pair and glob
#   - exit 0 = done, 1 = malfunction, 2 = bad input
######################################################################
set -euo pipefail

PAIRS=()
GLOBS=()
MODE="plan"

# parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --pair) PAIRS+=("$2"); shift 2 ;;
    --glob) GLOBS+=("$2"); shift 2 ;;
    --mode) MODE="$2"; shift 2 ;;
    --skill|--repo|--role) shift 2 ;;
    -h|--help) head -n 20 "$0" | tail -n 19; exit 0 ;;
    *) echo "✋ ConstraintError: unknown arg $1" >&2; exit 2 ;;
  esac
done

# validate input
if [[ ${#PAIRS[@]} -eq 0 || ${#GLOBS[@]} -eq 0 ]]; then
  echo "✋ ConstraintError: need at least one --pair 'old=>new' and one --glob" >&2
  exit 2
fi
if [[ "$MODE" != "plan" && "$MODE" != "apply" ]]; then
  echo "✋ ConstraintError: --mode must be plan or apply" >&2
  exit 2
fi

SEDREPLACE="$(git rev-parse --show-toplevel)/.agent/repo=ehmpathy/role=mechanic/skills/claude.tools/sedreplace.sh"

echo "🐢 heres the wave..."
echo ""
echo "🐚 terms.rename --mode $MODE"
for pair in "${PAIRS[@]}"; do
  old="${pair%%=>*}"
  new="${pair#*=>}"
  if [[ "$old" == "$pair" ]]; then
    echo "✋ ConstraintError: pair '$pair' lacks '=>'" >&2
    exit 2
  fi
  echo "   ├─ $old → $new"
  for glob in "${GLOBS[@]}"; do
    # plan, always; it is also the gate sedreplace needs before an apply
    planned="$(bash "$SEDREPLACE" --old "$old" --new "$new" --glob "$glob" 2>&1 || true)"
    count="$(printf '%s\n' "$planned" | sed -n 's/^.*matches: \([0-9]*\).*$/\1/p' | head -n 1)"
    echo "   │  ├─ ${count:-0} in $glob"
    if [[ "$MODE" == "apply" && -n "$count" && "$count" != "0" ]]; then
      bash "$SEDREPLACE" --old "$old" --new "$new" --glob "$glob" --mode apply > /dev/null
    fi
  done
done
echo "   └─ done"
