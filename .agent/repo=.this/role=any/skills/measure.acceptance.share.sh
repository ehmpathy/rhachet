#!/usr/bin/env bash
######################################################################
# 🧮 measure.acceptance.share — what a peer feels beside a live acceptance run
#
# .what = runs a fixed peer workload alone, then beside a scoped
#         acceptance run at each width, and reports the peer's slowdown
#         with peak load and cpu psi
#
# .why  = the suite's bound on a shared box is the peer's slowdown over
#         its own baseline; this is the reproducible measure of it
#
# usage:
#   rhx measure.acceptance.share --scope blackbox/cli/enroll.reach.acceptance.test.ts
#   rhx measure.acceptance.share --scope <file> --scope <file> --widths 25%,50%
#   rhx measure.acceptance.share --scope <file> --peer 'pnpm exec tsc --noEmit' --peer-runs 5
#
# options:
#   --scope       required, repeatable. a jest path regex for the acceptance files to run;
#                 a file path works, its dots match any char (escape them to be exact)
#   --widths      jest --maxWorkers values, comma-joined (default 25%,50%)
#   --peer        the peer shell command (default a fixed single-thread cpu loop)
#   --peer-runs   peer runs per measure, a positive integer, median taken (default 3)
#
# guarantee:
#   - exit 0 = measured; the record lands in .log/role=any/skill=measure.acceptance.share/
#   - exit 1 = malfunction (the peer failed)
#   - exit 2 = constraint (absent --scope, an unknown flag)
#   - reads quiet = no when the baseline box is busy; a busy-box number is not the bound
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

show_help() {
  # the header block, from below the first rule to above the second
  awk 'NR > 2 && /^#####/ { exit } NR > 2 { sub(/^# ?/, ""); print }' "${BASH_SOURCE[0]}"
  exit 0
}

require_value() {
  local flag="$1" value="${2:-}"
  if [[ -z "$value" || "$value" == --* ]]; then
    echo "✋ ConstraintError: absent value for $flag" >&2
    echo "   └─ rhx measure.acceptance.share help" >&2
    exit 2
  fi
}

ARGS=()
SCOPE_COUNT=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    help|--help|-h) show_help ;;
    --skill|--repo|--role) shift 2 ;;
    --scope)
      require_value "$1" "${2:-}"
      ARGS+=("$1" "$2"); SCOPE_COUNT=$((SCOPE_COUNT + 1)); shift 2 ;;
    --widths|--peer|--peer-runs)
      require_value "$1" "${2:-}"
      ARGS+=("$1" "$2"); shift 2 ;;
    *)
      echo "✋ ConstraintError: unknown argument: $1" >&2
      echo "   └─ rhx measure.acceptance.share help" >&2
      exit 2 ;;
  esac
done

for ((i = 0; i < ${#ARGS[@]}; i += 2)); do
  if [[ "${ARGS[$i]}" == "--peer-runs" && ! "${ARGS[$((i + 1))]}" =~ ^[1-9][0-9]*$ ]]; then
    echo "✋ ConstraintError: --peer-runs must be a positive integer, got: ${ARGS[$((i + 1))]}" >&2
    echo "   └─ e.g. --peer-runs 3" >&2
    exit 2
  fi
done

if [[ "$SCOPE_COUNT" -eq 0 ]]; then
  echo "✋ ConstraintError: absent required arg: --scope" >&2
  echo "   └─ name the acceptance files to run, e.g. --scope blackbox/cli/enroll.reach.acceptance.test.ts" >&2
  exit 2
fi

TSX_BIN="$SCRIPT_DIR/../../../../node_modules/.bin/tsx"
if [ ! -x "$TSX_BIN" ]; then
  echo "💥 MalfunctionError: tsx is not installed in this repo" >&2
  echo "   └─ pnpm install" >&2
  exit 1
fi
cd "$(git rev-parse --show-toplevel)"
exec "$TSX_BIN" "$SCRIPT_DIR/measure.acceptance.share.ts" "${ARGS[@]}"