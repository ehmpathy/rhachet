#!/usr/bin/env bash
######################################################################
# .what = show output from a background Claude Code task
#
# .why = when running long commands in background (npm run test, etc),
#        output is written to /tmp/claude/.../tasks/<id>.output
#        this skill makes it easy to read that output without
#        constructing the full path manually
#
# .when = use this skill when:
#   - you ran a command in background and need to see results
#   - TaskOutput shows task completed but you need to see full output
#   - test results were truncated and you need to see more
#   - you want to grep/search through task output
#
# usage:
#   show.claude.task.output.sh --id <task_id>              # show last 100 lines
#   show.claude.task.output.sh --id <task_id> --lines 200  # show last 200 lines
#   show.claude.task.output.sh --id <task_id> --all        # show entire output
#   show.claude.task.output.sh --id <task_id> --grep "FAIL" # search output
#
# examples:
#   show.claude.task.output.sh --id b6f1f52
#   show.claude.task.output.sh --id b6f1f52 --lines 50
#   show.claude.task.output.sh --id b6f1f52 --grep "Test Suites:"
######################################################################

set -euo pipefail

# parse args
TASK_ID=""
LINES=100
SHOW_ALL=false
GREP_PATTERN=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --id)
      TASK_ID="$2"
      shift 2
      ;;
    --lines)
      LINES="$2"
      shift 2
      ;;
    --all)
      SHOW_ALL=true
      shift
      ;;
    --grep)
      GREP_PATTERN="$2"
      shift 2
      ;;
    *)
      echo "unknown arg: $1"
      exit 1
      ;;
  esac
done

# validate task id
if [[ -z "$TASK_ID" ]]; then
  echo "error: --id is required"
  echo "usage: show.claude.task.output.sh --id <task_id>"
  exit 1
fi

# construct path based on current workspace
# claude stores outputs in /tmp/claude/<workspace-path>/tasks/<id>.output
WORKSPACE_PATH=$(pwd | sed 's|/|-|g')
OUTPUT_FILE="/tmp/claude/$WORKSPACE_PATH/tasks/${TASK_ID}.output"

# check file exists
if [[ ! -f "$OUTPUT_FILE" ]]; then
  echo "error: task output not found at $OUTPUT_FILE"
  echo ""
  echo "available tasks:"
  ls -la "/tmp/claude/$WORKSPACE_PATH/tasks/" 2>/dev/null || echo "  (no tasks directory)"
  exit 1
fi

# show output
if [[ -n "$GREP_PATTERN" ]]; then
  grep -E "$GREP_PATTERN" "$OUTPUT_FILE" || echo "(no matches for pattern: $GREP_PATTERN)"
elif [[ "$SHOW_ALL" == "true" ]]; then
  cat "$OUTPUT_FILE"
else
  tail -n "$LINES" "$OUTPUT_FILE"
fi
