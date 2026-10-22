#!/usr/bin/env bash
######################################################################
# .what = read or set the title of the pull for the current branch
#
# .why  = `gh pr edit` is not pre-approved, and a pull's title is set
#         from its first commit — which can name a behavior the branch
#         later replaced. this paves the one read and the one write
#
# .note = interim; promoted into rhachet-roles-ehmpathy via
#         ehmpathy/rhachet-roles-ehmpathy#1035
#
# usage:
#   rhx git.pull.title get                                   # this branch's pull
#   rhx git.pull.title get --pull 636
#   rhx git.pull.title set --title 'fix(x): y'               # plan
#   rhx git.pull.title set --title 'fix(x): y' --mode apply  # write
#
# options:
#   --pull    get: a pull number (default: the pull of this branch)
#   --title   set: the new title (required)
#   --mode    set: plan (default, no write) | apply
#
# guarantee:
#   - set writes only the open pull whose head is the current branch, never on main
#   - set refuses a title that holds a secret-shaped value
#   - set refuses a title in a temporary state (wip, draft, tbd, [inflight], …):
#     a title is always the final one the squash-merge carries
#     (rule.forbid.a-pr-title-or-body-in-a-temporary-state)
#   - exit 0 = shown, planned or written · 1 = malfunction · 2 = bad input
######################################################################
set -euo pipefail

VERB=""
PULL=""
TITLE=""
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
  echo "🐚 git.pull.title — read or set the title of this branch's pull"
  echo "   ├─ usage"
  echo "   │  ├─ rhx git.pull.title get [--pull <n>]"
  echo "   │  └─ rhx git.pull.title set --title '<title>' [--mode plan|apply]"
  echo "   ├─ example: rhx git.pull.title set --title 'fix(clone): y' --mode apply"
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
    --title) TITLE="${2:-}"; shift 2 ;;
    --mode) MODE="${2:-}"; shift 2 ;;
    help|--help|-h) emit_help; exit 0 ;;
    *) refuse "unknown arg '$1'; the verbs are get, set" "rhx git.pull.title --help" ;;
  esac
done

# require a verb
if [[ -z "$VERB" ]]; then
  emit_help
  exit 0
fi

# get: show the title
if [[ "$VERB" == "get" ]]; then
  [[ -z "$PULL" || "$PULL" =~ ^[0-9]+$ ]] || refuse "--pull must be a number, got '$PULL'" "--pull 636"
  TARGET="${PULL:-$(git rev-parse --abbrev-ref HEAD)}"
  ONE="$(gh pr view "$TARGET" --json number,title,url)" || refuse "no pull found for '$TARGET'" "rhx git.commit.push --mode apply --auth as-human"
  echo "🐢 heres the wave..."
  echo ""
  echo "🐚 git.pull.title get"
  echo "   ├─ pull: #$(echo "$ONE" | jq -r .number) ($(echo "$ONE" | jq -r .url))"
  echo "   └─ title: $(echo "$ONE" | jq -r .title)"
  exit 0
fi

# set: validate the input
[[ -n "${TITLE//[[:space:]]/}" ]] || refuse "--title is required" "rhx git.pull.title set --title 'fix(x): y'"
[[ "$MODE" == "plan" || "$MODE" == "apply" ]] || refuse "--mode must be plan or apply, got '$MODE'" "--mode plan"
SECRET_PATTERN='(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|gho_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{20,}|xox[abpors]-[A-Za-z0-9-]{10,})'
if printf '%s' "$TITLE" | grep -Eq "$SECRET_PATTERN"; then
  refuse "the title holds a secret-shaped value" "remove it; a pull title is public to every reader of the repo"
fi

# refuse a temporary state: the title is the one the squash-merge carries
TEMPORARY_PATTERN='(^|[^a-z0-9])(wip|draft|tbd|todo|fixme|placeholder|dnm|do not merge|in progress|inflight)([^a-z0-9]|$)'
MARK="$(printf '%s' "$TITLE" | grep -oiE "$TEMPORARY_PATTERN" | head -n 1 | sed -E 's/^[^a-zA-Z]+|[^a-zA-Z]+$//g' || true)"
if [[ -n "$MARK" ]]; then
  refuse "the title holds a temporary state ('$MARK'); a pull title is the final title the squash-merge carries" "drop '$MARK' and state the change as it will land, e.g. 'fix(clone): a leaf clone may not spawn'"
fi

# find this branch's open pull
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[[ "$BRANCH" != "main" && "$BRANCH" != "master" ]] || refuse "refused on $BRANCH: a pull title belongs to a feature branch" "checkout the feature branch"
ONE="$(gh pr view "$BRANCH" --json number,title,headRefName,state,url)" || refuse "no pull found for branch $BRANCH" "rhx git.commit.push --mode apply --auth as-human"
NUM="$(echo "$ONE" | jq -r .number)"
[[ "$(echo "$ONE" | jq -r .headRefName)" == "$BRANCH" ]] || refuse "pull #$NUM heads another branch" "checkout its branch"
[[ "$(echo "$ONE" | jq -r .state)" == "OPEN" ]] || refuse "pull #$NUM is not open" "set the title on an open pull"
OLD="$(echo "$ONE" | jq -r .title)"

# emit the plan
echo "🐢 heres the wave..."
echo ""
echo "🐚 git.pull.title set --mode $MODE"
echo "   ├─ pull: #$NUM ($(echo "$ONE" | jq -r .url))"
echo "   ├─ before: $OLD"
echo "   ├─ after:  $TITLE"
if [[ "$OLD" == "$TITLE" ]]; then
  echo "   └─ verdict: already set — no-op"
  exit 0
fi
if [[ "$MODE" == "plan" ]]; then
  echo "   └─ verdict: would write (plan; rerun with --mode apply)"
  exit 0
fi

# write it
REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)" || { echo "💥 MalfunctionError: could not derive the current repo via gh" >&2; exit 1; }
gh api --method PATCH "repos/$REPO/pulls/$NUM" -f title="$TITLE" --silent || { echo "💥 MalfunctionError: gh api failed to write the title of pull #$NUM" >&2; exit 1; }
echo "   └─ verdict: written"
