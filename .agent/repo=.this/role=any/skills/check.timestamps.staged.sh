#!/usr/bin/env bash
######################################################################
# .what = list EVERY staged line the pre-commit timestamp check would refuse
#
# .why  = .husky/check.timestamps.sh halts on the first hit, so a commit with
#         several hits costs one failed commit per hit. this lists them all at
#         once, with the same pattern and the same exempt files, so one pass
#         of edits clears the gate
#
# usage:
#   rhx check.timestamps.staged
#
# guarantee:
#   - reads the staged blobs only; writes no file
#   - the pattern and the .ts/.sh exemption match .husky/check.timestamps.sh
#   - exit 0 = no hit · 2 = hits found (each printed as file:line:text)
######################################################################
set -euo pipefail

# the pattern of .husky/check.timestamps.sh, verbatim
TIMESTAMP_PATTERN='T?[0-9][0-9]:[0-9][0-9]:[0-9][0-9](Z|[+-][0-9][0-9]:?[0-9][0-9])?'

hits=0
while IFS= read -r file; do
  [ -n "$file" ] || continue
  case "$file" in
    *.ts | *.sh) continue ;;
  esac
  content=$(git show ":$file")
  matches=$(printf '%s\n' "$content" | grep -nIE "$TIMESTAMP_PATTERN" || true)
  [ -n "$matches" ] || continue
  while IFS= read -r line; do
    printf '%s:%s\n' "$file" "${line:0:200}"
    hits=$((hits + 1))
  done <<< "$matches"
done < <(git diff --cached --name-only --diff-filter=ACM)

if [ "$hits" -eq 0 ]; then
  echo "🐢 sweet, no staged timestamps"
  exit 0
fi
echo "✋ ConstraintError: $hits staged lines hold a timestamp the pre-commit check refuses" >&2
exit 2
