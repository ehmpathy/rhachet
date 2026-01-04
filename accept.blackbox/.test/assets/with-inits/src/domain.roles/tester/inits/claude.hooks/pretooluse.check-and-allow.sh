#!/usr/bin/env bash
######################################################################
# .what = test init that reads stdin json and exits based on content
# .why = proves pipe input can be parsed and used for control flow
######################################################################

# read stdin
STDIN_DATA=$(cat)

# write received data for verification
echo "$STDIN_DATA" > stdin-check-received.txt

# parse and decide (simple grep-based check)
if echo "$STDIN_DATA" | grep -q '"blocked":true'; then
  echo "BLOCKED: operation not allowed" >&2
  exit 1
fi

echo "ALLOWED: operation permitted"
exit 0
