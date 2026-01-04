#!/usr/bin/env bash
######################################################################
# .what = test version of forbid-gerunds hook for acceptance tests
# .why = validates that init scripts receive stdin and can parse JSON
######################################################################

set -euo pipefail

# read JSON from stdin
STDIN_INPUT=$(cat)

# failfast: if no input, error
if [[ -z "$STDIN_INPUT" ]]; then
  echo "ERROR: PreToolUse hook received no input via stdin" >&2
  exit 2
fi

# write received input for verification
echo "$STDIN_INPUT" > gerunds-stdin-received.txt

# extract tool name
TOOL_NAME=$(echo "$STDIN_INPUT" | jq -r '.tool_name // empty' 2>/dev/null || echo "")

# skip if not Write or Edit
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  echo "SKIPPED: tool $TOOL_NAME not Write or Edit"
  exit 0
fi

# extract content to scan
if [[ "$TOOL_NAME" == "Write" ]]; then
  CONTENT=$(echo "$STDIN_INPUT" | jq -r '.tool_input.content // empty' 2>/dev/null || echo "")
else
  CONTENT=$(echo "$STDIN_INPUT" | jq -r '.tool_input.new_string // empty' 2>/dev/null || echo "")
fi

# skip if no content
if [[ -z "$CONTENT" ]]; then
  echo "SKIPPED: no content to scan"
  exit 0
fi

# extract -ing words (split camelCase first, then grep)
mapfile -t ING_WORDS < <(
  echo "$CONTENT" | \
    sed 's/\([a-z]\)\([A-Z]\)/\1 \2/g' | \
    grep -oE '\b[a-zA-Z]+ing\b' | \
    sort -u || true
)

# simple allowlist for test
ALLOWLIST=("string" "something" "nothing" "anything" "everything" "thing" "ring" "bring" "spring" "king" "ding" "ping" "wing" "sing" "fling" "sling" "sting" "swing" "bling" "cling")

# filter against allowlist
GERUNDS=()
for word in "${ING_WORDS[@]}"; do
  if [[ -n "$word" ]]; then
    is_allowed=false
    lower_word=$(echo "$word" | tr '[:upper:]' '[:lower:]')
    for allowed in "${ALLOWLIST[@]}"; do
      if [[ "$lower_word" == "$allowed" ]]; then
        is_allowed=true
        break
      fi
    done
    if [[ "$is_allowed" == "false" ]]; then
      GERUNDS+=("$word")
    fi
  fi
done

# if no gerunds detected, allow
if [[ ${#GERUNDS[@]} -eq 0 ]]; then
  echo "ALLOWED: no gerunds detected"
  exit 0
fi

# write detected gerunds for verification
printf '%s\n' "${GERUNDS[@]}" > gerunds-detected.txt

# block with message
{
  echo ""
  echo "BLOCKED: gerund(s) detected"
  echo ""
  echo "detected gerunds:"
  for gerund in "${GERUNDS[@]}"; do
    echo "  - $gerund"
  done
  echo ""
} >&2

exit 2
