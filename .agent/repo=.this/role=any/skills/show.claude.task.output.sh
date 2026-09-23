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
    --repo|--role|--skill)
      # rhachet passthrough args - ignore
      shift 2
      ;;
    --help|-h)
      echo "usage: show.claude.task.output.sh --id <task_id> [options]"
      echo ""
      echo "options:"
      echo "  --id ID            background task id (required)"
      echo "  --lines N          show last N lines (default: 100)"
      echo "  --all              show entire output"
      echo "  --grep PATTERN     search output for PATTERN"
      exit 0
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

# find the task output, never compute its path
#
# .why = claude's layout drifts in three places a computed path cannot track:
#        the root is uid-suffixed (/tmp/claude-1000), the workspace slug
#        sanitizes '.' and '_' to '-', and a per-session uuid dir sits between
#        the workspace and tasks/. a find matches whatever shape is on disk.
OUTPUT_FILE=$(find /tmp/claude* -path "*/tasks/${TASK_ID}.output" -type f -printf '%T@ %p\n' 2>/dev/null \
  | sort -rn | head -n 1 | cut -d' ' -f2-)

# check file exists
if [[ -z "$OUTPUT_FILE" ]]; then
  echo "error: no task output found for id '${TASK_ID}'"
  echo ""
  echo "  looked under: /tmp/claude*/**/tasks/${TASK_ID}.output"
  echo "  hint: the id is the one the background tool printed at launch"
  echo ""
  echo "available tasks:"
  find /tmp/claude* -path '*/tasks/*.output' -type f -printf '  %f\n' 2>/dev/null \
    | sort -u | head -n 20 || echo "  (none found)"
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
