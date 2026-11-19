#!/usr/bin/env bash
######################################################################
# .what = run one `rhx` command from this worktree's build and report
#         how many modules it loaded, grouped by package
#
# .why  = every rhx call pays its module-eval cost; a cold command that
#         loads thousands of modules is slow in every test that calls it.
#         this names the packages behind the count, so an eager import
#         can be found and made lazy (rule.require.thinnest-import-path)
#
# usage:
#   rhx cli.load.profile -- actor list
#   rhx cli.load.profile --top 40 -- enroll claude --help
#
# options:
#   --top N   rows to show (default 25)
#   --        every arg after it is passed to rhx as is
#
# guarantee:
#   - runs ./bin/run.jit (this worktree's dist); run `npm run build` first
#   - the report goes to stdout, since the command's own stdout is dropped;
#     the command's stderr rides beside it; its exit code is kept
######################################################################
set -euo pipefail

TOP=25
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) sed -n '3,22p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    --top) TOP="$2"; shift 2 ;;
    # the rhx dispatcher passes its own lookup args through; they are not ours
    --skill|--repo|--role) shift 2 ;;
    --) shift; break ;;
    *) echo "unknown option: $1 (pass rhx args after --)" >&2; exit 2 ;;
  esac
done

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SKILL_DIR" rev-parse --show-toplevel)"

export CLI_LOAD_PROFILE_TOP="$TOP"
START=$(date +%s%N)
set +e
node --experimental-strip-types --experimental-transform-types --disable-warning=ExperimentalWarning \
  --require "$SKILL_DIR/cli.load.profile.hook.js" \
  "$REPO_ROOT/bin/run.jit" "$@" 2>&1 >/dev/null
CODE=$?
set -e
END=$(date +%s%N)
echo "⏱  wall: $(( (END - START) / 1000000 ))ms  (exit $CODE)"
exit $CODE
