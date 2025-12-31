#!/usr/bin/env bash
######################################################################
# .what = counts words in provided text
# .why = solid skill (deterministic, no brain) for testing
#
# usage:
#   wordcount.sh --text "hello world"
#   wordcount.sh --input input.txt --output output.json
#
# output:
#   { "count": <number> }
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

# count words
COUNT=$(echo "$TEXT" | wc -w | tr -d ' ')

# output result
RESULT="{\"count\": $COUNT}"

if [[ -n "$OUTPUT" ]]; then
  echo "$RESULT" > "$OUTPUT"
else
  echo "$RESULT"
fi
