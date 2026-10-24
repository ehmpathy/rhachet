#!/usr/bin/env bash
######################################################################
# .what = run acceptance suites that read no credential, via jest direct
#
# .why  = `rhx git.repo.test --what acceptance` unlocks the whole `test`
#         env first, so an sso key that lapsed halts EVERY shard, even
#         one that spawns the cli against a temp repo and reads no key.
#         the acceptance globalSetup sources keys in `lenient` mode, so
#         jest direct runs such a shard with no unlock at all
#         (rule.require.check-the-precondition-before-you-escalate)
#
# usage:
#   rhx test.acceptance.credfree --scope 'focus\.acceptance'
#   rhx test.acceptance.credfree --scope 'init\.focus' --resnap
#
# options:
#   --scope    jest path regex for the suites to run (required)
#   --resnap   write snapshots (default: verify only, under --ci)
#
# guarantee:
#   - builds when stale, then runs jest with the acceptance config
#   - runs with CLAUDE_CONFIG_DIR unset, as ci does, so a clone's env
#     never reaches a snapshot
#   - never unlocks the keyrack; a suite that truly reads a key fails
#     in that test with a legible error
#   - the full output lands in .log/role=any/skill=test.acceptance.credfree/;
#     stdout carries the failed tests, the totals, and the log path
#   - a non-zero exit from jest is passed through
######################################################################
set -euo pipefail

SCOPE=""
RESNAP=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --scope) SCOPE="$2"; shift 2 ;;
    --resnap) RESNAP="true"; shift ;;
    --help|-h) awk 'NR > 2 && /^#/ { sub(/^# ?/, ""); print } /^set -euo/ { exit }' "$0" | grep -v '^#*$' || :; exit 0 ;;
    --skill|--repo|--role) shift 2 ;;
    *) echo "✋ ConstraintError: unknown option: $1" >&2; exit 2 ;;
  esac
done
[[ -n "$SCOPE" ]] || { echo "✋ ConstraintError: --scope is required" >&2; exit 2; }

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# every run keeps its full output, both streams, so a failure can be read after
LOG_DIR=".log/role=any/skill=test.acceptance.credfree"
mkdir -p "$LOG_DIR"
LOG_PATH="$LOG_DIR/$(date -u +%Y-%m-%dT%H-%M-%SZ).log"

# run as ci runs: a clone's own CLAUDE_CONFIG_DIR leaks into the cli under test (a role init
#   prints a `note: this clone's config dir is …` line for it), which ci never sets, so a
#   snapshot written here would fail there
unset CLAUDE_CONFIG_DIR

# test infra runs through pnpm, never npm (rule.forbid.npm-in-tests); absent pnpm fails fast
command -v pnpm > /dev/null || {
  echo "✋ ConstraintError: pnpm is required" >&2
  echo "   └─ hint: corepack enable pnpm (or see https://pnpm.io/installation)" >&2
  exit 2
}

# resnap writes snapshots (the package command reads RESNAP); the default verifies them under
#   CI=true, which jest reads as --ci, so an unwritten snapshot fails as it does in ci
set +e
if [[ -n "$RESNAP" ]]; then
  RESNAP=true pnpm run test:acceptance:locally "$SCOPE" > "$LOG_PATH" 2>&1
else
  CI=true pnpm run test:acceptance:locally "$SCOPE" > "$LOG_PATH" 2>&1
fi
STATUS=$?
set -e

# the summary, as a tree: each failed test, jest's totals as it printed them, then the log
#   .note = the totals are quoted jest lines (data), so their colons are the data's own
FAILED="$(grep -E '^\s+✕' "$LOG_PATH" | sed -E 's/^\s+//' || true)"
TOTALS="$(grep -E '^Tests:|^Test Suites:|^Snapshots:' "$LOG_PATH" || true)"

# print each line of a list as a leaf under a branch; the last leaf closes it
print_leaves() {
  local lines="$1"
  local count
  count="$(printf '%s\n' "$lines" | grep -c .)"
  local index=0
  while IFS= read -r one; do
    [[ -z "$one" ]] && continue
    index=$((index + 1))
    if [[ "$index" -eq "$count" ]]; then echo "   │  └─ $one"; else echo "   │  ├─ $one"; fi
  done <<< "$lines"
}

echo "🧮 test.acceptance.credfree --scope '$SCOPE'"
if [[ -n "$FAILED" ]]; then
  echo "   ├─ failed"
  print_leaves "$FAILED"
  echo "   │"
fi
echo "   ├─ totals"
print_leaves "$TOTALS"
echo "   │"
echo "   └─ log"
echo "      └─ $LOG_PATH"
exit "$STATUS"
