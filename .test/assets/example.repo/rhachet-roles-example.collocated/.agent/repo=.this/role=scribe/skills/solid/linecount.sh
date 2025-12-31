#!/usr/bin/env bash
######################################################################
# .what = counts lines in provided text
# .why = solid skill (deterministic, no brain) for testing
#
# usage:
#   linecount.sh --text "line1\nline2\nline3"
#   linecount.sh --input input.txt --output output.json
#
# output:
#   { "lines": <number> }
######################################################################
set -euo pipefail

# parse args
TEXT=""
INPUT=""
OUTPUT=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --text)
      TEXT="$2"
      shift 2
      ;;
    --input)
      INPUT="$2"
      shift 2
      ;;
    --output)
      OUTPUT="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# get text from input file if provided
if [[ -n "$INPUT" ]]; then
  TEXT=$(cat "$INPUT")
fi

# count lines (handle empty string as 0 lines)
if [[ -z "$TEXT" ]]; then
  LINES=0
else
  LINES=$(echo -e "$TEXT" | wc -l | tr -d ' ')
fi

# output result
RESULT="{\"lines\": $LINES}"

if [[ -n "$OUTPUT" ]]; then
  echo "$RESULT" > "$OUTPUT"
else
  echo "$RESULT"
fi
