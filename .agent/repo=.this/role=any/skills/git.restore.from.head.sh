#!/usr/bin/env bash
######################################################################
# .what = restore named tracked paths to their HEAD content
#
# .why  = a run that resnaps wider than it was scoped moves snapshots
#         it never verified (rule.forbid.blanket-resnap-after-rebase);
#         the cure is to put each of those files back as HEAD holds it,
#         by name, never by a sweep
#
# usage:
#   rhx git.restore.from.head --path a.snap --path b.snap               # plan
#   rhx git.restore.from.head --path a.snap --path b.snap --mode apply  # restore
#
# guarantee:
#   - plan by default; names each path and whether it differs from HEAD
#   - each path must sit inside the repo and be tracked at HEAD
#   - a path deleted from the worktree is restored too
#   - exit 0 = done, 2 = bad input
######################################################################
set -euo pipefail

MODE="plan"
PATHS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --path) PATHS+=("$2"); shift 2 ;;
    --mode) MODE="$2"; shift 2 ;;
    --help|-h) sed -n '2,19p' "$0"; exit 0 ;;
    --skill|--repo|--role) shift 2 ;;
    *) echo "✋ ConstraintError: unknown arg '$1'" >&2; exit 2 ;;
  esac
done

if [[ ${#PATHS[@]} -eq 0 ]]; then
  echo "✋ ConstraintError: no --path named" >&2
  echo "   └─ fix = rhx git.restore.from.head --path <file> [--mode apply]" >&2
  exit 2
fi
if [[ "$MODE" != "plan" && "$MODE" != "apply" ]]; then
  echo "✋ ConstraintError: --mode must be plan or apply" >&2
  exit 2
fi

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

# each path must be tracked at HEAD
for p in "${PATHS[@]}"; do
  if ! git cat-file -e "HEAD:$p" 2>/dev/null; then
    echo "✋ ConstraintError: not tracked at HEAD" >&2
    echo "   └─ path = $p" >&2
    exit 2
  fi
done

echo "🔭 git.restore.from.head --mode $MODE"
COUNT=${#PATHS[@]}
i=0
for p in "${PATHS[@]}"; do
  i=$((i + 1))
  GLYPH="├─"
  [[ $i -eq $COUNT ]] && GLYPH="└─"
  STATE="moved"
  if [[ -e "$p" ]] && git diff --quiet HEAD -- "$p"; then STATE="already at HEAD"; fi
  [[ ! -e "$p" ]] && STATE="deleted"
  echo "   $GLYPH $p ($STATE)"
done

if [[ "$MODE" == "apply" ]]; then
  git checkout HEAD -- "${PATHS[@]}"
  echo ""
  echo "✨ restored $COUNT paths from HEAD"
fi
