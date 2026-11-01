#!/usr/bin/env bash
######################################################################
# .what = run tier-3 live-brain tests on demand, scoped, via git.repo.test
#
# .why  = tier-3 suites skip unless BRAIN_LIVE_SCOPE=all; an env-prefixed
#         jest call is not paved for a crew seat, so this is the one paved
#         door. a --scope is required: each live test spends real money,
#         so a run targets the suites it means to, never the whole tier
#
# usage:
#   rhx test.brain.live --what integration --scope path://actorAsk --mode apply
#   rhx test.brain.live --what acceptance --scope path://clone.joker --mode apply
#   rhx test.brain.live --help
#
# options:
#   --what   integration | acceptance (required)
#   --scope  a git.repo.test scope (required; repeatable; at least one a path scope)
#   (every other flag passes through to git.repo.test, e.g. --mode apply)
#
# guarantee:
#   - sets BRAIN_LIVE_SCOPE=all for this run only
#   - exit 2 on an absent --what or --scope; else the exit of git.repo.test
######################################################################
set -euo pipefail

# the fix most refusals name
FIX_DEFAULT="rhx test.brain.live --what integration --scope path://actorAsk"

# refuse with a named fix; every refusal carries one
refuse() {
  echo "✋ ConstraintError: $1" >&2
  echo "   └─ fix" >&2
  echo "      └─ $2" >&2
  exit 2
}

# refuse a flag that ends the line with no value, with the fix
need_value() {
  if [[ $# -lt 2 || -z "$2" || "$2" == --* ]]; then
    refuse "$1 needs a value" "$FIX_DEFAULT"
  fi
}

# the most tier-3 suites one scope may run; each live suite spends real money
LIVE_SCOPE_SUITES_MAX=3

# refuse a scope that names the whole tree
need_narrow_scope() {
  case "$1" in
    .|./|'*'|'**'|/|path://|path://.|path://./|'path://*'|'path://**')
      refuse "--scope $1 matches the whole tree, so it would run every tier-3 suite" "$FIX_DEFAULT"
      ;;
  esac
}

# refuse path scopes that together match more tier-3 suites than the cap
# .note = counted as jest selects: each path scope is its own testPathPattern, and jest ORs them,
#   ignores case, and matches the absolute path; so the count is the union, case-blind, over
#   absolute paths, and a scope that jest widens (ACTORASK, a part of the repo root path, four
#   stacked scopes) is counted as wide as it runs
# .note = the gated set is a text twin of the clamp's syntax-tree check
#   (src/.test/infra/getAllSuitesGated.ts): any line that opens with the gate call, at any indent
#   and with any space before its paren. no formatter runs on blackbox/, so the twin reads loose;
#   a nested match can only overcount, which refuses more, never less. a parity row in
#   test.brain.live.integration.test.ts holds the two counts equal on this repo
# list the absolute path of each test file that opens a gate call
# .note = the same file universe the clamp globs (getAllLivePaths): the whole tree bar
#   node_modules, .git, dist, .yalc, the .log, .behavior and .dream records, and .agent, plus
#   .agent/repo=.this
list_suites_gated() {
  local gate='^[[:space:]]*describeBrainLiveOnDemand[[:space:]]*\('
  {
    grep -rlE --include='*.test.ts' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
      --exclude-dir=.yalc --exclude-dir=.log --exclude-dir=.behavior --exclude-dir=.dream --exclude-dir=.temp \
      --exclude-dir=.agent "$gate" . 2>/dev/null
    grep -rlE --include='*.test.ts' --exclude-dir=node_modules "$gate" .agent/repo=.this 2>/dev/null
  } | while read -r path; do echo "$PWD/${path#./}"; done
}

need_suites_within_cap() {
  local patterns=()
  local one
  for one in "$@"; do patterns+=(-e "$one"); done
  local count
  # grep's own complaint on a bad pattern is silenced; the refusal below names it, header first
  count=$(list_suites_gated | grep -ciE "${patterns[@]}" 2>/dev/null || true)
  if [[ ! "$count" =~ ^[0-9]+$ ]]; then
    refuse "--scope $* could not be read as a path pattern" "rhx test.brain.live --what $WHAT --scope path://actorAsk"
  fi
  if (( count > LIVE_SCOPE_SUITES_MAX )); then
    refuse_over_cap "$count" "${patterns[@]}"
  fi
}

# refuse a scope past the cap, and name each suite it matched, so the human sees what to drop
refuse_over_cap() {
  local count="$1"
  shift
  echo "✋ ConstraintError: the path scopes match $count tier-3 suites, past the $LIVE_SCOPE_SUITES_MAX one live run may take" >&2
  echo "   ├─ matched" >&2
  # an inner grep with no match exits 1, so the list's status is not the refusal's
  local matched
  matched="$({ list_suites_gated | grep -iE "$@" | sed "s|^$PWD/||" | sort; } || true)"
  sed '$!s|^|   │  ├─ |;$s|^|   │  └─ |' <<< "$matched" >&2
  echo "   │" >&2
  echo "   └─ fix" >&2
  # the fix is a copy-paste command: it names the first matched suite alone
  echo "      └─ rhx test.brain.live --what $WHAT --scope path://${matched%%$'\n'*}" >&2
  exit 2
}

# print the usage, the inputs, and a worked example
print_help() {
  echo "🐢 test.brain.live — run tier-3 live-brain tests on demand, scoped"
  echo "   ├─ usage"
  echo "   │  └─ rhx test.brain.live --what <integration|acceptance> --scope <scope> [--mode apply]"
  echo "   ├─ inputs"
  echo "   │  ├─ --what   integration | acceptance (required)"
  echo "   │  └─ --scope  a git.repo.test scope (required, repeatable; at least one a path scope)"
  echo "   ├─ guarantee"
  echo "   │  ├─ sets BRAIN_LIVE_SCOPE=all for this run only"
  echo "   │  ├─ refuses a scope that matches more than $LIVE_SCOPE_SUITES_MAX tier-3 suites"
  echo "   │  ├─ every other flag passes to git.repo.test, which refuses one it does not know"
  echo "   │  ├─ without --mode apply, git.repo.test shows the matched files and runs none"
  echo "   │  └─ exit 2 = bad input · else the exit of git.repo.test"
  echo "   └─ example"
  echo "      ├─ rhx test.brain.live --what integration --scope path://actorAsk"
  echo "      └─ rhx test.brain.live --what integration --scope path://actorAsk --mode apply"
}

# a path scope is one the cap counts; a name scope matches by title, across every file
is_path_scope() {
  [[ "$1" != name://* ]]
}

# hold a path scope's pattern for the cap
add_path_scope() {
  is_path_scope "$1" || return 0
  HAS_PATH_SCOPE=true
  PATH_PATTERNS+=("${1#path://}")
}

WHAT=""
HAS_SCOPE=false
HAS_PATH_SCOPE=false
PATH_PATTERNS=()
PASS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h) print_help; exit 0 ;;
    --skill|--repo|--role) shift 2 ;;
    --what) need_value "$@"; WHAT="$2"; PASS+=(--what "$WHAT"); shift 2 ;;
    --what=*) WHAT="${1#--what=}"; PASS+=(--what "$WHAT"); shift ;;
    --scope) need_value "$@"; need_narrow_scope "$2"; HAS_SCOPE=true; add_path_scope "$2"; PASS+=(--scope "$2"); shift 2 ;;
    --scope=*) need_narrow_scope "${1#--scope=}"; HAS_SCOPE=true; add_path_scope "${1#--scope=}"; PASS+=(--scope "${1#--scope=}"); shift ;;
    *) PASS+=("$1"); shift ;; # forwarded: git.repo.test refuses an unknown flag
  esac
done

# refuse an absent tier or scope, with the fix
if [[ -z "$WHAT" ]]; then
  refuse "--what is required, since it names the tier to run (integration or acceptance)" "$FIX_DEFAULT"
fi
if [[ "$WHAT" != "integration" && "$WHAT" != "acceptance" ]]; then
  refuse "--what must be integration or acceptance, got '$WHAT'" "$FIX_DEFAULT"
fi
if [[ "$HAS_SCOPE" != "true" ]]; then
  refuse "--scope is required, since each live test spends real money" "rhx test.brain.live --what $WHAT --scope path://actorAsk"
fi
if [[ "$HAS_PATH_SCOPE" != "true" ]]; then
  refuse "a name:// scope alone matches by title in every file, so a path scope must bound the run" "rhx test.brain.live --what $WHAT --scope path://actorAsk --scope name://t0"
fi
need_suites_within_cap "${PATH_PATTERNS[@]}"

# acceptance needs a target and an env; default both to the local test env
if [[ "$WHAT" == "acceptance" && ! " ${PASS[*]} " =~ " --against " ]]; then
  PASS+=(--against local --env test)
fi

# run with the tier-3 gate open, for this call only
BRAIN_LIVE_SCOPE=all exec rhx git.repo.test "${PASS[@]}"