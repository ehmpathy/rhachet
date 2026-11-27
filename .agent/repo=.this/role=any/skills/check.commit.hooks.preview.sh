#!/usr/bin/env bash
######################################################################
# .what = preview which files the pre-commit content hooks would refuse,
#         before any file is staged
#
# .why  = check.timestamps.sh and check.secrets.sh halt at the FIRST staged
#         file that fails, so a commit of many files finds its blockers one
#         at a time. this runs the real hooks, file by file, against a
#         throwaway git index, and lists every file each would refuse
#
# usage:
#   check.commit.hooks.preview.sh                     # files changed vs origin/main, plus untracked
#   check.commit.hooks.preview.sh --paths 'a.md b.md' # only these paths
#
# guarantee:
#   - the repo's own index is never touched (GIT_INDEX_FILE points at a temp file)
#   - the hooks run unchanged, so their patterns cannot drift from this preview
#   - gitignored files are skipped, as a commit would skip them
#   - exit 0 = no file refused, 2 = at least one file refused, 1 = malfunction
######################################################################
set -euo pipefail

# parse args
PATHS=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --paths) PATHS="$2"; shift 2 ;;
    # rhx hands its own flags through ahead of the caller's
    --skill|--repo|--role) shift 2 ;;
    --help|-h) sed -n '2,21p' "$0"; exit 0 ;;
    *) echo "✋ ConstraintError: unknown option: $1" >&2; exit 2 ;;
  esac
done

# find the repo root and the hooks
ROOT=$(git rev-parse --show-toplevel)
HOOKS=("$ROOT/.husky/check.timestamps.sh" "$ROOT/.husky/check.secrets.sh")
for hook in "${HOOKS[@]}"; do
  if [[ ! -f "$hook" ]]; then
    echo "💥 MalfunctionError: hook not found" >&2
    echo "   └─ $hook" >&2
    exit 1
  fi
done

# collect the candidate files: changed vs origin/main, plus untracked, minus deletions
if [[ -n "$PATHS" ]]; then
  read -r -a FILES <<< "$PATHS"
else
  mapfile -t FILES < <(
    {
      git -C "$ROOT" -c core.quotepath=off diff --name-only --diff-filter=ACMR origin/main
      git -C "$ROOT" -c core.quotepath=off ls-files --others --exclude-standard
    } | sort -u
  )
fi

# a throwaway index, removed on exit
TMP_INDEX=$(mktemp)
trap 'rm -f "$TMP_INDEX"' EXIT

# .note = a repo-generic skill wears no role-mascot; a preview reads, so it roots on 🔭
echo "🔭 check.commit.hooks.preview"
echo "   ├─ ${#FILES[@]} files"

# run each hook per file against the throwaway index
# .note = a hook exits 2 to refuse a file and 1 on its own malfunction; the two are
#         counted apart, so a broken hook never reads as a content refusal
REFUSED=0
FAULTED=0
for file in "${FILES[@]}"; do
  [[ -f "$ROOT/$file" ]] || continue
  if git -C "$ROOT" check-ignore -q "$file"; then continue; fi
  rm -f "$TMP_INDEX"
  GIT_INDEX_FILE="$TMP_INDEX" git -C "$ROOT" read-tree --empty
  GIT_INDEX_FILE="$TMP_INDEX" git -C "$ROOT" add -f -- "$file"
  for hook in "${HOOKS[@]}"; do
    code=0
    out=$(cd "$ROOT" && GIT_INDEX_FILE="$TMP_INDEX" bash "$hook" 2>&1) || code=$?
    [[ "$code" -eq 0 ]] && continue
    glyph="✋"
    if [[ "$code" -eq 2 ]]; then
      REFUSED=$((REFUSED + 1))
    else
      FAULTED=$((FAULTED + 1))
      glyph="💥"
    fi
    echo "   ├─ $glyph $(basename "$hook" .sh) (exit $code)"
    echo "   │  └─ $(printf '%s\n' "$out" | tail -n 1 | sed -E 's/^[ │├└─]+//' | cut -c1-160)"
  done
done

# report: a malfunction outranks a refusal
if [[ "$FAULTED" -gt 0 ]]; then
  echo "   └─ 💥 $FAULTED hook malfunctions, $REFUSED refusals"
  exit 1
fi
if [[ "$REFUSED" -eq 0 ]]; then
  echo "   └─ ✨ no file refused"
  exit 0
fi
echo "   └─ $REFUSED refusals"
exit 2
