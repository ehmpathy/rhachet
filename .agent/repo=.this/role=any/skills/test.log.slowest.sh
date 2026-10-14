#!/usr/bin/env bash
######################################################################
# .what = rank the slowest tests in a jest --verbose log
#
# .why  = a slow suite is fixed at its slowest tests; this names them,
#         with a total, so the wait can be found rather than guessed
#
# usage:
#   rhx test.log.slowest --log .log/role=mechanic/skill=git.repo.test/what=acceptance/<iso>.stderr.log
#   rhx test.log.slowest --log <path> --top 60
#
# options:
#   --log   path to a jest --verbose log, inside the repo (required)
#   --top   rows to show (default 40)
#
# guarantee:
#   - read only; exit 2 on bad args or a log outside the repo
######################################################################
set -euo pipefail

LOG=""
TOP=40
while [[ $# -gt 0 ]]; do
  case "$1" in
    --log) LOG="$2"; shift 2 ;;
    --top) TOP="$2"; shift 2 ;;
    --skill|--repo|--role) shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done
[[ -n "$LOG" ]] || { echo "--log is required" >&2; exit 2; }

REPO_ROOT="$(git rev-parse --show-toplevel)"
LOG_ABS="$(realpath "$LOG")"
[[ "$LOG_ABS" == "$REPO_ROOT"/* ]] || { echo "log must sit inside the repo" >&2; exit 2; }
[[ -f "$LOG_ABS" ]] || { echo "log not found: $LOG" >&2; exit 2; }

ROWS="$(grep -oE '[✓✕] .*\([0-9]+ ms\)' "$LOG_ABS" | sed -E 's/^(.*)\(([0-9]+) ms\)$/\2\t\1/' || true)"
SORTED="$(echo "$ROWS" | sort -rn)"
awk -v top="$TOP" 'NR <= top' <<< "$SORTED" | cut -c1-180
echo
echo "$ROWS" | awk -F'\t' 'NF { s += $1; n++ } END { printf "%d timed tests, sum %.1fs\n", n, s / 1000 }'
