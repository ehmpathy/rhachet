#!/usr/bin/env bash
######################################################################
# .what = run a test skill as ci runs it: on the node `.nvmrc` pins,
#         with no clone env
#
# .why  = a box whose default node differs from `.nvmrc` fails suites
#         that ci passes. node 24 refuses (`connect EINVAL`) the long
#         keyrack socket path a deep temp dir yields, which node 22
#         accepts, and it adds a `module.exports` key to a cjs import
#         (measured 2026-11-15: 8 sdk suites red on 24, green on 22). a clone's
#         CLAUDE_CONFIG_DIR adds a `note:` line to each role init. none
#         is a defect of the code under test
#
# usage:
#   rhx test.as.ci git.repo.test --what integration --mode apply
#   rhx test.as.ci test.acceptance.credfree --scope 'blackbox/sdk/keyrack'
#
# options:
#   $1     the test skill to run: git.repo.test | test.acceptance.credfree
#   rest   pass through to that skill, unchanged
#
# guarantee:
#   - runs under the exact node version in `.nvmrc`, via fnm
#   - unsets CLAUDE_CONFIG_DIR, as ci never sets it
#   - fails fast, exit 2, when fnm or the pinned node is absent, with
#     the install command, or when $1 names no test skill
#   - passes the exit code of the skill through
######################################################################
set -euo pipefail

# drop the dispatch flags rhx adds, so only the skill's own flags pass through
# .note = rhx passes its dispatch flags first, so help is read here, not from $1
ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill|--repo|--role) shift 2 ;;
    *) ARGS+=("$1"); shift ;;
  esac
done

# print help, when it is the first arg the caller gave
if [[ "${ARGS[0]:-}" == "--help" || "${ARGS[0]:-}" == "-h" ]]; then
  awk 'NR > 2 && /^#/ { sub(/^# ?/, ""); print } /^set -euo/ { exit }' "$0" | grep -v '^#*$' || :
  exit 0
fi

# the first arg names the test skill; only test skills are allowed
SKILL="${ARGS[0]:-}"
case "$SKILL" in
  git.repo.test|test.acceptance.credfree) ARGS=("${ARGS[@]:1}") ;;
  *)
    echo "✋ ConstraintError: name the test skill to run first" >&2
    echo "   └─ rhx test.as.ci git.repo.test --what unit --mode apply" >&2
    exit 2
    ;;
esac

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# read the pinned node version
[[ -f .nvmrc ]] || { echo "✋ ConstraintError: no .nvmrc at $REPO_ROOT" >&2; exit 2; }
NODE_PIN="$(tr -d '[:space:]' < .nvmrc)"

# require fnm and the pinned node
command -v fnm > /dev/null || {
  echo "✋ ConstraintError: fnm is required to run under node $NODE_PIN" >&2
  echo "   └─ install fnm: https://github.com/Schniz/fnm#installation" >&2
  exit 2
}
fnm exec --using="$NODE_PIN" -- node --version > /dev/null 2>&1 || {
  echo "✋ ConstraintError: node $NODE_PIN is not installed" >&2
  echo "   └─ fnm install $NODE_PIN" >&2
  exit 2
}

# run as ci runs: the pinned node, no clone config dir
echo "🔭 test.as.ci"
echo "   ├─ node = $NODE_PIN"
echo "   └─ CLAUDE_CONFIG_DIR = unset"
echo ""
unset CLAUDE_CONFIG_DIR
exec fnm exec --using="$NODE_PIN" -- npx rhx "$SKILL" "${ARGS[@]}"
