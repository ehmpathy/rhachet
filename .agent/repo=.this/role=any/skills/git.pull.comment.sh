#!/usr/bin/env bash
######################################################################
# .what = read, post, or delete the comments of a pull request
#
# .why  = a driver who works a review must read every comment, answer
#         each in its own thread, and clean up its own slips — without a
#         raw gh call at each step. one skill, three verbs
#
# .note = interim; promoted into rhachet-roles-ehmpathy via
#         ehmpathy/rhachet-roles-ehmpathy#1035
#
# usage:
#   rhx git.pull.comment get --pull 636                          # every comment, tree
#   rhx git.pull.comment get --pull 636 --output json            # json
#   rhx git.pull.comment set --pull 636 --body @stdin            # a new top-level comment (plan)
#   rhx git.pull.comment set --pull 636 --reply 123 --body 'fixed in abc1234' --mode apply
#   rhx git.pull.comment del --pull 636 --comment 456 --mode apply
#
# verbs:
#   get   read every comment on the pull: review summaries, line comments,
#         and conversation comments
#   set   post a comment, or reply to one. the skill prefixes every body it
#         writes with 🐢 — always, never left to the caller
#   del   delete one comment, ONLY one the robot authored: a bot account's,
#         or this login's own comment that opens with 🐢. a human comment is
#         refused, exit 2
#
# options:
#   --pull     pull request number (required)
#   --reply    set: the comment id to answer (default: a new top-level comment)
#   --body     set: @stdin | <path> | '<text>' (required)
#   --comment  del: the comment id (required)
#   --output   get: tree (default) | json
#   --mode     set, del: plan (default, no write) | apply
#   --in       owner/name (default: the current repo). not --repo, which
#              rhachet itself passes to every skill
#
# guarantee:
#   - get reads only (gh api --method GET)
#   - set is a findsert: the same 🐢 body from this login in the same
#     thread already there → no-op
#   - exit 0 = shown, planned or written · 1 = malfunction · 2 = bad input
######################################################################
set -euo pipefail

VERB=""
PULL=""
REPLY=""
BODY_SRC=""
COMMENT=""
OUTPUT="tree"
MODE="plan"
REPO=""
MARK="🐢"

# refuse with a named fix
refuse() {
  echo "✋ ConstraintError: $1" >&2
  echo "   └─ fix: $2" >&2
  exit 2
}

# fail on a gh malfunction
malfunction() {
  echo "💥 MalfunctionError: $1" >&2
  exit 1
}

# show help
emit_help() {
  echo "🐢 heres the wave..."
  echo ""
  echo "🐚 git.pull.comment — read, post, or delete the comments of a pull"
  echo "   ├─ usage"
  echo "   │  ├─ rhx git.pull.comment get --pull <n> [--output tree|json]"
  echo "   │  ├─ rhx git.pull.comment set --pull <n> [--reply <id>] --body @stdin|<path>|'<text>' [--mode plan|apply]"
  echo "   │  └─ rhx git.pull.comment del --pull <n> --comment <id> [--mode plan|apply]"
  echo "   ├─ set prefixes every body with 🐢; del refuses any comment the robot did not author"
  echo "   ├─ example: rhx git.pull.comment set --pull 636 --reply 123 --body 'fixed in abc1234' --mode apply"
  echo "   └─ exit: 0 done, 1 malfunction, 2 bad input"
}

# parse args; the verb is the one bare word, wherever rhachet places it
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill|--repo|--role) shift 2 ;;
    --) shift ;;
    get|set|del)
      [[ -z "$VERB" ]] || refuse "two verbs given: '$VERB' and '$1'" "name one verb: get, set or del"
      VERB="$1"; shift ;;
    --pull) PULL="${2:-}"; shift 2 ;;
    --reply) REPLY="${2:-}"; shift 2 ;;
    --body) BODY_SRC="${2:-}"; shift 2 ;;
    --comment) COMMENT="${2:-}"; shift 2 ;;
    --output) OUTPUT="${2:-}"; shift 2 ;;
    --mode) MODE="${2:-}"; shift 2 ;;
    --in) REPO="${2:-}"; shift 2 ;;
    help|--help|-h) emit_help; exit 0 ;;
    *) refuse "unknown arg '$1'; the verbs are get, set, del" "rhx git.pull.comment --help" ;;
  esac
done

# require a verb
if [[ -z "$VERB" ]]; then
  emit_help
  exit 0
fi

# validate the shared input
[[ "$PULL" =~ ^[0-9]+$ ]] || refuse "--pull <number> is required" "rhx git.pull.comment $VERB --pull 636"
[[ "$MODE" == "plan" || "$MODE" == "apply" ]] || refuse "--mode must be plan or apply, got '$MODE'" "--mode plan"

# derive the repo
if [[ -z "$REPO" ]]; then
  REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)" || malfunction "could not derive the current repo via gh"
fi

# read every comment on the pull, as one list
#   kind = review (a review summary) · line (a review comment on a file) · issue (a conversation comment)
read_all_comments() {
  local reviews lines issues
  reviews="$(gh api --method GET --paginate "repos/$REPO/pulls/$PULL/reviews" | jq -cs 'add // []')" || malfunction "gh api failed to read the reviews of $REPO#$PULL"
  lines="$(gh api --method GET --paginate "repos/$REPO/pulls/$PULL/comments" | jq -cs 'add // []')" || malfunction "gh api failed to read the line comments of $REPO#$PULL"
  issues="$(gh api --method GET --paginate "repos/$REPO/issues/$PULL/comments" | jq -cs 'add // []')" || malfunction "gh api failed to read the conversation comments of $REPO#$PULL"
  jq -cn --argjson r "$reviews" --argjson l "$lines" --argjson i "$issues" '
    [ $r[] | select((.body // "") != "") | { kind: "review", id, author: (.user.login // null), authorType: (.user.type // null), state, at: .submitted_at, path: null, line: null, review: null, in_reply_to: null, body: (.body // ""), url: .html_url } ]
    + [ $l[] | { kind: "line", id, author: (.user.login // null), authorType: (.user.type // null), state: null, at: .created_at, path, line: (.line // .original_line // null), review: .pull_request_review_id, in_reply_to: (.in_reply_to_id // null), body, url: .html_url } ]
    + [ $i[] | { kind: "issue", id, author: (.user.login // null), authorType: (.user.type // null), state: null, at: .created_at, path: null, line: null, review: null, in_reply_to: null, body, url: .html_url } ]
    | sort_by(.at)'
}

# read the gh login
read_me() {
  gh api --method GET user --jq .login || malfunction "could not read the gh login"
}

# get: show every comment
if [[ "$VERB" == "get" ]]; then
  [[ "$OUTPUT" == "tree" || "$OUTPUT" == "json" ]] || refuse "--output must be tree or json, got '$OUTPUT'" "--output tree"
  ALL="$(read_all_comments)"
  if [[ "$OUTPUT" == "json" ]]; then
    echo "$ALL" | jq .
    exit 0
  fi
  echo "🐢 heres the wave..."
  echo ""
  echo "🐚 git.pull.comment get --pull $PULL"
  echo "   ├─ repo: $REPO"
  echo "   ├─ count: $(echo "$ALL" | jq 'length') comments"
  echo "$ALL" | jq -r '
    def indent(p): gsub("\r"; "") | sub("\n+$"; "") | split("\n") | map(p + . | sub(" +$"; "")) | join("\n");
    (length) as $n
    | if $n == 0 then "   └─ (no comments)" else
      ( to_entries[]
        | .key as $i | .value as $c
        | (if $i == $n - 1 then "   └─ " else "   ├─ " end) as $head
        | (if $i == $n - 1 then "      " else "   │  " end) as $pad
        | $head + "\($c.id) · \($c.kind)\(if $c.state then " " + $c.state else "" end) · by \($c.author // "?")"
          + (if $c.path then " · \($c.path):\($c.line // "file")" else "" end)
          + (if $c.in_reply_to then " · reply-to \($c.in_reply_to)" else "" end)
          + "\n" + ($c.body | indent($pad + "   ")) )
      end'
  exit 0
fi

# set: post a comment, or reply to one
if [[ "$VERB" == "set" ]]; then
  [[ -n "$BODY_SRC" ]] || refuse "--body @stdin|<path>|'<text>' is required" "rhx git.pull.comment set --pull $PULL --body 'the answer'"
  [[ -z "$REPLY" || "$REPLY" =~ ^[0-9]+$ ]] || refuse "--reply must be a numeric comment id, got '$REPLY'" "rhx git.pull.comment get --pull $PULL lists the ids"

  # read the body the caller wrote
  if [[ "$BODY_SRC" == "@stdin" ]]; then
    TEXT="$(cat)"
  elif [[ -f "$BODY_SRC" ]]; then
    TEXT="$(cat "$BODY_SRC")"
  else
    TEXT="$BODY_SRC"
  fi
  [[ -n "${TEXT//[[:space:]]/}" ]] || refuse "the body is empty" "write the answer first"

  # the skill marks every body it writes; a caller's own mark is not doubled
  TEXT="${TEXT#"$MARK"}"
  TEXT="${TEXT#"${TEXT%%[![:space:]]*}"}"
  BODY="$MARK $TEXT"

  # find the target thread
  ALL="$(read_all_comments)"
  ME="$(read_me)"
  TARGET_KIND="new"
  if [[ -n "$REPLY" ]]; then
    TARGET_KIND="$(echo "$ALL" | jq -r --argjson id "$REPLY" 'map(select(.id == $id)) | .[0].kind // "absent"')"
    [[ "$TARGET_KIND" != "absent" ]] || refuse "comment $REPLY is not on $REPO#$PULL" "rhx git.pull.comment get --pull $PULL lists the ids"
  fi

  # findsert: the same body from this login in the same thread is already there
  if [[ "$TARGET_KIND" == "line" ]]; then
    FOUND="$(echo "$ALL" | jq --arg me "$ME" --arg body "$BODY" --argjson id "$REPLY" 'map(select(.author == $me and .in_reply_to == $id and (.body | gsub("\\s+$"; "")) == ($body | gsub("\\s+$"; "")))) | length')"
  else
    FOUND="$(echo "$ALL" | jq --arg me "$ME" --arg body "$BODY" 'map(select(.author == $me and .kind == "issue" and (.body | gsub("\\s+$"; "")) == ($body | gsub("\\s+$"; "")))) | length')"
  fi

  # a review summary or a conversation comment has no thread: the answer is a
  #   conversation comment that links the one it answers
  if [[ "$TARGET_KIND" == "review" || "$TARGET_KIND" == "issue" ]]; then
    TARGET_URL="$(echo "$ALL" | jq -r --argjson id "$REPLY" 'map(select(.id == $id)) | .[0].url')"
    BODY="$MARK re: $TARGET_URL

$TEXT"
    FOUND="$(echo "$ALL" | jq --arg me "$ME" --arg body "$BODY" 'map(select(.author == $me and .kind == "issue" and (.body | gsub("\\s+$"; "")) == ($body | gsub("\\s+$"; "")))) | length')"
  fi

  # emit the plan
  echo "🐢 heres the wave..."
  echo ""
  echo "🐚 git.pull.comment set --pull $PULL${REPLY:+ --reply $REPLY} --mode $MODE"
  echo "   ├─ repo: $REPO"
  echo "   ├─ as: $ME"
  echo "   ├─ into: $(if [[ "$TARGET_KIND" == "line" ]]; then echo "the thread of $REPLY"; elif [[ "$TARGET_KIND" == "new" ]]; then echo "a new conversation comment"; else echo "a conversation comment that links $REPLY"; fi)"
  echo "   ├─ body"
  echo "$BODY" | sed 's/^/   │     /'
  if [[ "$FOUND" != "0" ]]; then
    echo "   └─ verdict: already posted — no-op"
    exit 0
  fi
  if [[ "$MODE" == "plan" ]]; then
    echo "   └─ verdict: would post (plan; rerun with --mode apply)"
    exit 0
  fi

  # post it
  if [[ "$TARGET_KIND" == "line" ]]; then
    URL="$(gh api --method POST "repos/$REPO/pulls/$PULL/comments/$REPLY/replies" -f body="$BODY" --jq .html_url)" || malfunction "gh api failed to post the reply to $REPLY"
  else
    URL="$(gh api --method POST "repos/$REPO/issues/$PULL/comments" -f body="$BODY" --jq .html_url)" || malfunction "gh api failed to post a comment on $REPO#$PULL"
  fi
  echo "   └─ verdict: posted — $URL"
  exit 0
fi

# del: delete one comment the robot authored
[[ "$COMMENT" =~ ^[0-9]+$ ]] || refuse "--comment <id> is required" "rhx git.pull.comment get --pull $PULL lists the ids"
ALL="$(read_all_comments)"
ME="$(read_me)"
ONE="$(echo "$ALL" | jq -c --argjson id "$COMMENT" 'map(select(.id == $id)) | .[0] // null')"
[[ "$ONE" != "null" ]] || refuse "comment $COMMENT is not on $REPO#$PULL" "rhx git.pull.comment get --pull $PULL lists the ids"
KIND="$(echo "$ONE" | jq -r .kind)"
[[ "$KIND" != "review" ]] || refuse "comment $COMMENT is a review summary, which gh does not delete" "leave it"

# robot-authored = a bot account's comment, or this login's own comment that opens with the mark
IS_ROBOT="$(echo "$ONE" | jq --arg me "$ME" --arg mark "$MARK" '(.authorType == "Bot") or (.author == $me and (.body | startswith($mark)))')"
[[ "$IS_ROBOT" == "true" ]] || refuse "comment $COMMENT was authored by a human ($(echo "$ONE" | jq -r '.author // "?"')); del touches only a robot comment" "a human deletes their own comment"

# emit the plan
echo "🐢 heres the wave..."
echo ""
echo "🐚 git.pull.comment del --pull $PULL --comment $COMMENT --mode $MODE"
echo "   ├─ repo: $REPO"
echo "   ├─ by: $(echo "$ONE" | jq -r '.author // "?"')"
echo "   ├─ body"
echo "$ONE" | jq -r .body | sed 's/^/   │     /'
if [[ "$MODE" == "plan" ]]; then
  echo "   └─ verdict: would delete (plan; rerun with --mode apply)"
  exit 0
fi

# delete it
if [[ "$KIND" == "line" ]]; then
  gh api --method DELETE "repos/$REPO/pulls/comments/$COMMENT" --silent || malfunction "gh api failed to delete comment $COMMENT"
else
  gh api --method DELETE "repos/$REPO/issues/comments/$COMMENT" --silent || malfunction "gh api failed to delete comment $COMMENT"
fi
echo "   └─ verdict: deleted"
