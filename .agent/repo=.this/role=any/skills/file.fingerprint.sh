#!/usr/bin/env bash
######################################################################
# .what = print a file's fingerprint: sha256, size, mode, inode, mtime
#
# .why  = "the file is untouched" is a claim a proof must measure. run
#         this before and after an act; equal lines mean no write landed.
#         same bytes alone would pass a temp-and-rename rewrite, which
#         swaps the inode, so all five facts are printed
#
# usage:
#   rhx file.fingerprint --path .agent/.actors/actor.via.repo=ambient/brain/.claude/settings.of.grove.json
#
# guarantee:
#   - reads only; never writes
#   - follows symlinks: the fingerprint is of the file the arrow lands at,
#     and the line names that target
#   - prints no content, only a digest, so a private file stays private
#   - exit 0 = printed, exit 2 = no such file
######################################################################
set -euo pipefail

FILE_PATH=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --path) FILE_PATH="$2"; shift 2 ;;
    --help|-h)
      echo "usage: rhx file.fingerprint --path <file>"
      exit 0 ;;
    --skill|--repo|--role) shift 2 ;;
    *) echo "✋ ConstraintError: unknown arg $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$FILE_PATH" ]]; then
  echo "✋ ConstraintError: --path is required" >&2
  exit 2
fi
if [[ ! -e "$FILE_PATH" ]]; then
  echo "✋ ConstraintError: no file at $FILE_PATH" >&2
  exit 2
fi

TARGET=$(readlink -f -- "$FILE_PATH")
DIGEST=$(sha256sum -- "$TARGET" | cut -d' ' -f1)
FACTS=$(stat -L -c '%s %a %i %Y' -- "$FILE_PATH")
read -r SIZE MODE INODE MTIME <<< "$FACTS"

echo "🐢 sweet"
echo ""
echo "🐚 file.fingerprint --path $FILE_PATH"
echo "   ├─ lands at = $TARGET"
echo "   ├─ sha256 = $DIGEST"
echo "   ├─ size = $SIZE"
echo "   ├─ mode = $MODE"
echo "   ├─ inode = $INODE"
echo "   └─ mtime = $MTIME"
