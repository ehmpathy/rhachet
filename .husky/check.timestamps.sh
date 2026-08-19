#!/bin/bash

# .what = block commit of files that embed a timestamp (T?HH:MM:SS{tz})
# .why  = timestamps in snapshots permadrift — they change every run, so the
#         snapshot can never be "correct" twice; mask them to keep it stable
# .how  = scan staged files (except .ts/.sh) for the pattern; halt with a
#         constraint error (exit 2) if any are found

# fail fast on errors and unbound vars (safe here: scan pipelines end in `head`
# so a no-match grep does not abort, and all vars are assigned before use)
set -eu

# the timestamp pattern: optional lead T, HH:MM:SS, optional timezone (Z, ±HH:MM, ±HHMM)
TIMESTAMP_PATTERN='T?[0-9][0-9]:[0-9][0-9]:[0-9][0-9](Z|[+-][0-9][0-9]:?[0-9][0-9])?'

# collect staged files (added/copied/modified); skip deletions
staged=$(git diff --cached --name-only --diff-filter=ACM)

# scan each staged file for a raw timestamp
# note: the here-doc feeds the loop in the current shell (no pipe subshell),
#       so `exit 2` halts the commit directly and a clean pass falls through
while IFS= read -r file; do
  # skip empty lines
  [ -n "$file" ] || continue

  # skip exempt code files (.ts and .sh legitimately carry time logic)
  case "$file" in
    *.ts | *.sh) continue ;;
  esac

  # read the staged content; fail loud if git cannot read the staged blob
  # (2>&1 captures git's error into the var so the halt message can surface it)
  if ! content=$(git show ":$file" 2>&1); then
    printf '💥 check.timestamps: failed to read staged content for %s\n' "$file" >&2
    printf '   └─ %s\n' "$content" >&2
    exit 1
  fi

  # halt if the staged content embeds a raw timestamp
  match=$(printf '%s\n' "$content" | grep -nIE "$TIMESTAMP_PATTERN" | head -n 1)
  if [ -n "$match" ]; then
    printf '✋ timestamps are forbidden in snapshots. mask them to prevent permadrift\n'
    printf '   └─ %s:%s\n' "$file" "$match"
    exit 2
  fi
done <<EOF
$staged
EOF
