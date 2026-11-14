#!/usr/bin/env bash
######################################################################
# .what = run the repo's commit hook `.husky/check.secrets.sh` against
#         what a full stage (`git add -A`) of the worktree would commit,
#         and leave the real stage untouched
#
# .why  = the hook scans every staged file whole, so one key-shaped
#         literal in any touched file (a fixture, a fake cli, a doc that
#         quotes a key) refuses the commit at the last step. this shows
#         the refusal before the commit is attempted
#
# usage:
#   rhx check.secrets.preview
#
# guarantee:
#   - stages into a temp copy of the index (GIT_INDEX_FILE); the real
#     index, the worktree and HEAD are never written
#   - runs the hook itself, so its shapes and its verdict are the hook's
#   - exit 0 = clean; exit 2 = a shape found (the hook names the file and
#     line, never the value); exit 1 = malfunction
######################################################################

set -euo pipefail

# the dispatcher's own flags, recognized so any other arg stays a true refusal
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo|--role|--skill)
      shift 2
      ;;
    *)
      echo "✋ ConstraintError: unknown arg: $1" >&2
      echo "   └─ usage: rhx check.secrets.preview" >&2
      exit 2
      ;;
  esac
done

ROOT="$(git rev-parse --show-toplevel)"
HOOK="$ROOT/.husky/check.secrets.sh"

# fail fast if the hook is absent
if [[ ! -f "$HOOK" ]]; then
  echo "✋ ConstraintError: .husky/check.secrets.sh is absent; this repo has no secrets hook to preview" >&2
  exit 2
fi

# copy the real index, so the preview starts from what is already staged
INDEX_REAL="$(git rev-parse --path-format=absolute --git-path index)"
INDEX_TEMP="$(mktemp)"
trap 'rm -f "$INDEX_TEMP"' EXIT
cp "$INDEX_REAL" "$INDEX_TEMP"

# stage the whole worktree into the temp index only
GIT_INDEX_FILE="$INDEX_TEMP" git -C "$ROOT" add -A

echo "🐢 lets check the stash..."
echo ""
echo "🐚 check.secrets.preview"
echo "   └─ files a full stage would commit = $(GIT_INDEX_FILE="$INDEX_TEMP" git -C "$ROOT" diff --cached --name-only --diff-filter=ACM | grep -c . || true)"
echo ""

# run the hook itself against the temp index; its exit is ours
cd "$ROOT"
GIT_INDEX_FILE="$INDEX_TEMP" bash "$HOOK"

echo "🌊 no secret key shape in what a full stage would commit"
