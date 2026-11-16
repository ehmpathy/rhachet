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
#   rhx test.acceptance.credfree --scope 'focus\.acceptance' --maxWorkers 100%
#
# options:
#   --scope       jest path regex for the suites to run (required)
#                 🟡 it matches the ABSOLUTE path, worktree dir included: in
#                 a worktree `…feat-keyrack/`, `--scope 'keyrack'` runs EVERY suite.
#                 anchor it on the file name: 'keyrack\.acceptance'.
#                 a scope that matches the repo root is refused, exit 2
#   --resnap      write snapshots (default: verify only, under --ci)
#   --maxWorkers  jest width, e.g. 100% to go wide on an idle box
#                 (default: a quarter of the cores, at least one, on a shared
#                 box; 50% on a github runner. the run header names it)
#
# guarantee:
#   - builds when stale, then runs jest with the acceptance config
#   - runs with CLAUDE_CONFIG_DIR unset, as ci does, so a clone's env
#     never reaches a snapshot
#   - never unlocks the keyrack; a suite that truly reads a key fails
#     in that test with a legible error
#   - the full output lands in .log/role=any/skill=test.acceptance.credfree/;
#     stdout carries the verdict (green or red) with its exit code, the failed tests,
#     the run's own notes (its width header, and any leak, reclaim,
#     starved, or leftover note), the totals, and the log path
#   - a red run where jest wrote no summary shows the log's last lines
#   - a scope that matches no suite is refused (exit 2), never a green run
#   - a non-zero exit from jest is passed through
#
# .note = a stopgap. it retires once git.repo.test gains an auth-skip mode
#         (ehmpathy/rhachet-roles-ehmpathy#1198); see the dream
#         .dream/2026_10_29.fix.retire-test-acceptance-credfree-once-git-repo-test-skips-auth.dream.md
######################################################################
set -euo pipefail

# refuse a flag that needs a value and got none, with an example of one (exit 2, a caller fix)
require_value() {
  local flag="$1" value="${2:-}" example="$3"
  [[ -n "$value" && "$value" != --* ]] && return 0
  echo "✋ ConstraintError: absent value for $flag" >&2
  echo "   └─ e.g. $flag $example" >&2
  exit 2
}

SCOPE=""
RESNAP=""
WIDTH_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --scope) require_value --scope "${2:-}" "'focus\.acceptance'"; SCOPE="$2"; shift 2 ;;
    --resnap) RESNAP="true"; shift ;;
    --maxWorkers) require_value --maxWorkers "${2:-}" '100%'; WIDTH_ARGS=(--maxWorkers "$2"); shift 2 ;;
    --help|-h) awk 'NR > 2 && /^#/ { sub(/^# ?/, ""); print } /^set -euo/ { exit }' "$0" | grep -v '^#*$' || :; exit 0 ;;
    --skill|--repo|--role) shift 2 ;;
    *)
      echo "✋ ConstraintError: unknown option: $1" >&2
      echo "   └─ rhx test.acceptance.credfree --help" >&2
      exit 2 ;;
  esac
done
[[ -n "$SCOPE" ]] || {
  {
    echo "✋ ConstraintError: --scope is required"
    echo "   ├─ e.g. rhx test.acceptance.credfree --scope 'init\\.focus\\.acceptance'"
    echo "   └─ see rhx test.acceptance.credfree --help"
  } >&2
  exit 2
}

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# refuse a scope that matches the repo root itself: jest reads it against each suite's absolute
#   path, so it would match every suite under the root and run the whole tier
#   (rule.forbid.local-full-test-sweeps). a caution in --help did not stop it; this does
if printf '%s/\n' "$REPO_ROOT" | grep -Eq -- "$SCOPE"; then
  echo "✋ ConstraintError: --scope matches the repo root, so it would run every suite" >&2
  echo "   ├─ scope = $SCOPE" >&2
  echo "   ├─ root  = $REPO_ROOT/" >&2
  echo "   └─ hint  = anchor it on the file name, e.g. 'init\\.actors-yml\\.acceptance'" >&2
  exit 2
fi

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
#   an asked width rides to jest, which the run header then reads as `(asked)`. the guarded
#   expansion keeps an empty width list legal under `set -u` on bash 3.2 (macos)
if [[ -n "$RESNAP" ]]; then
  RESNAP=true pnpm run test:acceptance:locally ${WIDTH_ARGS[@]+"${WIDTH_ARGS[@]}"} "$SCOPE" > "$LOG_PATH" 2>&1
else
  CI=true pnpm run test:acceptance:locally ${WIDTH_ARGS[@]+"${WIDTH_ARGS[@]}"} "$SCOPE" > "$LOG_PATH" 2>&1
fi
STATUS=$?
set -e

# refuse a scope that matched no suite: jest passes on no tests, so the run would read green
if grep -q '^No tests found' "$LOG_PATH"; then
  echo "✋ ConstraintError: no acceptance suite matched the scope" >&2
  echo "   ├─ scope = '$SCOPE'" >&2
  echo "   ├─ log = $LOG_PATH" >&2
  echo "   └─ the scope is a jest path regex, e.g. --scope 'focus\.acceptance'" >&2
  exit 2
fi

# the summary, as a tree: each failed test, the run's own notes, jest's totals, then the log
#   .note = the totals are quoted jest lines (data), so their colons are the data's own
FAILED="$(grep -E '^\s+✕' "$LOG_PATH" | sed -E 's/^\s+//' || true)"
TOTALS="$(grep -E '^Tests:|^Test Suites:|^Snapshots:' "$LOG_PATH" || true)"

# the run's own notes: the width header, and any leak, reclaim, starved, or leftover note.
#   each is a block at column 0 that opens with its glyph; its body lines are indented, so a
#   blank line or any other unindented line ends it (jest may write its totals right below the
#   last note). a leak turns the run red with no failed test, so its note is the only cause a
#   human can read
NOTES="$(awk '
  /^(ℹ|✋|💥) / { inside = 1; print; next }
  inside && /^   / { print; next }
  inside { inside = 0; print "" }
' "$LOG_PATH")"

# print each line of a list as a leaf under a branch; the last leaf closes it
print_leaves() {
  local lines="$1"
  local count
  count="$(printf '%s\n' "$lines" | grep -c . || true)"
  local index=0
  while IFS= read -r one; do
    [[ -z "$one" ]] && continue
    index=$((index + 1))
    if [[ "$index" -eq "$count" ]]; then echo "   │  └─ $one"; else echo "   │  ├─ $one"; fi
  done <<< "$lines"
}

# print a block of text as a code block under a branch
print_block() {
  local label="$1" block="$2"
  echo "   ├─ $label"
  echo "   │  ├─"
  echo "   │  │"
  while IFS= read -r one; do
    if [[ -z "$one" ]]; then echo "   │  │"; else echo "   │  │  $one"; fi
  done <<< "$block"
  echo "   │  └─"
  echo "   │"
}

# a red run where jest wrote no summary (a stale build that failed, a config error, a crash)
#   names no failed test and no totals; the log's last lines are then the only cause to show
TAIL=""
[[ "$STATUS" -ne 0 && -z "$FAILED" && -z "$TOTALS" ]] && TAIL="$(tail -n 15 "$LOG_PATH")"

FLAGS_ECHO="--scope '$SCOPE'"
[[ ${#WIDTH_ARGS[@]} -gt 0 ]] && FLAGS_ECHO="$FLAGS_ECHO --maxWorkers ${WIDTH_ARGS[1]}"
[[ -n "$RESNAP" ]] && FLAGS_ECHO="$FLAGS_ECHO --resnap"
echo "🧮 test.acceptance.credfree $FLAGS_ECHO"
VERDICT="green"
[[ "$STATUS" -ne 0 ]] && VERDICT="red"
echo "   ├─ result = $VERDICT, exit $STATUS"
echo "   │"
if [[ -n "$FAILED" ]]; then
  echo "   ├─ failed"
  print_leaves "$FAILED"
  echo "   │"
fi
[[ -n "$NOTES" ]] && print_block "notes" "$NOTES"
[[ -n "$TAIL" ]] && print_block "no summary from jest; the log ends with" "$TAIL"
if [[ -n "$TOTALS" ]]; then
  echo "   ├─ totals"
  print_leaves "$TOTALS"
  echo "   │"
fi
echo "   └─ log"
echo "      └─ $LOG_PATH"
exit "$STATUS"