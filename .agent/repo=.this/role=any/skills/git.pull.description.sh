#!/usr/bin/env bash
######################################################################
# .what = read or set the description of the pull for the current branch
#
# .why  = a driver drafts a pull description and then cannot land it:
#         `gh pr edit` is not pre-approved, and `git.commit.push` takes
#         no description. this paves the one read and the one write
#
# .note = interim; promoted into rhachet-roles-ehmpathy via
#         ehmpathy/rhachet-roles-ehmpathy#1035
#
# usage:
#   rhx git.pull.description get                                     # this branch's pull
#   rhx git.pull.description get --pull 636
#   rhx git.pull.description set --body .temp/pr.body.md             # plan: a diff
#   cat body.md | rhx git.pull.description set --body @stdin --mode apply
#
# options:
#   --pull    get: a pull number (default: the pull of this branch)
#   --body    set: @stdin | <path> (required)
#   --mode    set: plan (default, no write) | apply
#
# guarantee:
#   - set plan shows a diff of the current description against the new one,
#     and both lengths
#   - set writes only the open pull whose head is the current branch, never on main
#   - set refuses a description that holds a secret-shaped value
#   - set refuses a description in a temporary state: it is final, save one
#     explicit `[inflight]` line (at a line start) while work remains. no other
#     status mark (wip, draft, tbd, todo, …), no second `[inflight]` line, and no
#     appended log (an `update:` / `edit:` line, a struck-out `~~line~~`): revise
#     in place (rule.forbid.a-pr-title-or-body-in-a-temporary-state)
#   - code (fenced blocks, `inline spans`) is exempt from the temporary-state check
#   - exit 0 = shown, planned or written · 1 = malfunction · 2 = bad input
######################################################################
set -euo pipefail

VERB=""
PULL=""
BODY_SRC=""
MODE="plan"

# refuse with a named fix
refuse() {
  echo "✋ ConstraintError: $1" >&2
  echo "   └─ fix: $2" >&2
  exit 2
}

# show help
emit_help() {
  echo "🐢 heres the wave..."
  echo ""
  echo "🐚 git.pull.description — read or set the description of this branch's pull"
  echo "   ├─ usage"
  echo "   │  ├─ rhx git.pull.description get [--pull <n>]"
  echo "   │  └─ rhx git.pull.description set --body @stdin|<path> [--mode plan|apply]"
  echo "   ├─ example: rhx git.pull.description set --body .temp/pr.body.md --mode apply"
  echo "   └─ exit: 0 done, 1 malfunction, 2 bad input"
}

# parse args; the verb is the one bare word, wherever rhachet places it
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill|--repo|--role) shift 2 ;;
    --) shift ;;
    get|set)
      [[ -z "$VERB" ]] || refuse "two verbs given: '$VERB' and '$1'" "name one verb: get or set"
      VERB="$1"; shift ;;
    --pull) PULL="${2:-}"; shift 2 ;;
    --body) BODY_SRC="${2:-}"; shift 2 ;;
    --mode) MODE="${2:-}"; shift 2 ;;
    help|--help|-h) emit_help; exit 0 ;;
    *) refuse "unknown arg '$1'; the verbs are get, set" "rhx git.pull.description --help" ;;
  esac
done

# require a verb
if [[ -z "$VERB" ]]; then
  emit_help
  exit 0
fi

# get: show the description
if [[ "$VERB" == "get" ]]; then
  [[ -z "$PULL" || "$PULL" =~ ^[0-9]+$ ]] || refuse "--pull must be a number, got '$PULL'" "--pull 636"
  TARGET="${PULL:-$(git rev-parse --abbrev-ref HEAD)}"
  ONE="$(gh pr view "$TARGET" --json number,body,url)" || refuse "no pull found for '$TARGET'" "rhx git.commit.push --mode apply --auth as-human"
  echo "🐢 heres the wave..."
  echo ""
  echo "🐚 git.pull.description get"
  echo "   ├─ pull: #$(echo "$ONE" | jq -r .number) ($(echo "$ONE" | jq -r .url))"
  echo "   └─ description ($(echo "$ONE" | jq -r '.body // "" | length') chars)"
  echo "$ONE" | jq -r '.body // ""' | sed 's/^/         /'
  exit 0
fi

# set: validate the input
[[ -n "$BODY_SRC" ]] || refuse "--body @stdin|<path> is required" "rhx git.pull.description set --body .temp/pr.body.md"
[[ "$MODE" == "plan" || "$MODE" == "apply" ]] || refuse "--mode must be plan or apply, got '$MODE'" "--mode plan"
if [[ "$BODY_SRC" == "@stdin" ]]; then
  NEW="$(cat)"
else
  [[ -f "$BODY_SRC" ]] || refuse "--body file not found: $BODY_SRC" "name a file that exists, or pipe it with --body @stdin"
  NEW="$(cat "$BODY_SRC")"
fi
[[ -n "${NEW//[[:space:]]/}" ]] || refuse "the new description is empty" "write it first"
SECRET_PATTERN='(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|gho_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{20,}|xox[abpors]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)'
if printf '%s' "$NEW" | grep -Eq "$SECRET_PATTERN"; then
  refuse "the description holds a secret-shaped value" "remove it; a pull description is public to every reader of the repo"
fi

# refuse a temporary state; code is exempt, so drop fenced blocks and inline spans first
PROSE="$(printf '%s\n' "$NEW" | awk '/^[[:space:]]*```/ { fenced = !fenced; next } !fenced' | sed -E 's/`[^`]*`//g')"
INFLIGHT_COUNT="$(printf '%s\n' "$PROSE" | grep -ciE '^[[:space:]]*\[inflight\]' || true)"
if [[ "$INFLIGHT_COUNT" -gt 1 ]]; then
  refuse "the description holds $INFLIGHT_COUNT [inflight] lines; at most one is allowed" "keep one [inflight] line that names the work that remains, and revise it in place"
fi
PROSE_SANS_INFLIGHT="$(printf '%s\n' "$PROSE" | grep -viE '^[[:space:]]*\[inflight\]' || true)"
TEMPORARY_PATTERN='(^|[^a-z0-9])(wip|draft|tbd|todo|fixme|placeholder|dnm|do not merge|in progress|inflight)([^a-z0-9]|$)'
MARK_LINE="$(printf '%s\n' "$PROSE_SANS_INFLIGHT" | grep -iE "$TEMPORARY_PATTERN" | head -n 1 || true)"
if [[ -n "$MARK_LINE" ]]; then
  refuse "the description holds a temporary status outside the one [inflight] line: '$MARK_LINE'" "state the final truth there; work that remains goes on one line that starts with [inflight]"
fi
LOG_PATTERN='^[[:space:]]*(#+[[:space:]]*)?(\*\*)?(update|updated|edit|edited|changelog|addendum|revision)s?(\*\*)?([[:space:]]*[0-9]*)?[[:space:]]*([:(—-]|$)|~~[^~]+~~'
LOG_LINE="$(printf '%s\n' "$PROSE_SANS_INFLIGHT" | grep -iE "$LOG_PATTERN" | head -n 1 || true)"
if [[ -n "$LOG_LINE" ]]; then
  refuse "the description holds an appended log: '$LOG_LINE'" "revise the description in place to state what is true now; git and the pull's comments hold the history"
fi

# find this branch's open pull
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[[ "$BRANCH" != "main" && "$BRANCH" != "master" ]] || refuse "refused on $BRANCH: a pull description belongs to a feature branch" "checkout the feature branch"
ONE="$(gh pr view "$BRANCH" --json number,body,headRefName,state,url)" || refuse "no pull found for branch $BRANCH" "rhx git.commit.push --mode apply --auth as-human"
NUM="$(echo "$ONE" | jq -r .number)"
[[ "$(echo "$ONE" | jq -r .headRefName)" == "$BRANCH" ]] || refuse "pull #$NUM heads another branch" "checkout its branch"
[[ "$(echo "$ONE" | jq -r .state)" == "OPEN" ]] || refuse "pull #$NUM is not open" "set the description on an open pull"
OLD="$(echo "$ONE" | jq -r '.body // ""')"

# emit the plan
echo "🐢 heres the wave..."
echo ""
echo "🐚 git.pull.description set --mode $MODE"
echo "   ├─ pull: #$NUM ($(echo "$ONE" | jq -r .url))"
echo "   ├─ before: ${#OLD} chars"
echo "   ├─ after:  ${#NEW} chars"
echo "   ├─ diff"
diff <(printf '%s\n' "$OLD") <(printf '%s\n' "$NEW") | sed 's/^/   │     /' || true
if [[ "$OLD" == "$NEW" ]]; then
  echo "   └─ verdict: already set — no-op"
  exit 0
fi
if [[ "$MODE" == "plan" ]]; then
  echo "   └─ verdict: would write (plan; rerun with --mode apply)"
  exit 0
fi

# write it
REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)" || { echo "💥 MalfunctionError: could not derive the current repo via gh" >&2; exit 1; }
gh api --method PATCH "repos/$REPO/pulls/$NUM" -f body="$NEW" --silent || { echo "💥 MalfunctionError: gh api failed to write the description of pull #$NUM" >&2; exit 1; }
echo "   └─ verdict: written"
