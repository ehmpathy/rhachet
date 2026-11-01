#!/usr/bin/env bash
######################################################################
# .what = measure which ci test runs reached the anthropic api, per repo
#
# .why  = a test env that holds ANTHROPIC_API_KEY bills the api, not the
#         subscription; claude says so in its own banner ("API Usage
#         Billing") and, once the credit is gone, in "Credit balance too
#         low". this counts, per repo since a date, the test runs and the
#         runs whose failed-job logs carry either marker — evidence for a
#         caller table, never a guess
#
# usage:
#   rhx anthropic.ci.callers --since 2026-10-18
#   rhx anthropic.ci.callers --since 2026-10-18 --repos rhachet,rhachet-roles-bhrain
#   rhx anthropic.ci.callers --since 2026-10-18 --workflow test --scan 5
#
# options:
#   --since     an iso date; runs created on or after it (required)
#   --repos     a comma list of ehmpathy repos (default: the six that
#               declare ANTHROPIC_API_KEY in a keyrack manifest)
#   --workflow  the workflow name to count (default: test)
#   --scan      how many of the newest failed runs per repo to scan for
#               the markers (default: 5; each scan reads one run's log)
#
# guarantee:
#   - read only; it writes no file and changes no run
#   - a success run leaves no failed-job log, so its api use is not seen
#     here; the output says so, never reports it as zero
#   - a failed run whose log cannot be read is counted apart, never as a
#     run with no marker
#   - exit 0 = measured · 1 = malfunction · 2 = bad input
######################################################################
set -euo pipefail

SINCE=""
REPOS="rhachet,rhachet-roles-bhrain,rhachet-roles-bhuild,rhachet-roles-rhight,rhachet-roles-mhedic,rhachet-brains-anthropic"
WORKFLOW="test"
SCAN="5"

# refuse with a named fix
refuse() {
  echo "✋ ConstraintError: $1" >&2
  echo "   └─ fix" >&2
  echo "      └─ $2" >&2
  exit 2
}

# print the usage, the inputs, the guarantee, and a worked example
print_help() {
  echo "🐢 anthropic.ci.callers — measure which ci test runs reached the anthropic api, per repo"
  echo "   ├─ usage"
  echo "   │  └─ rhx anthropic.ci.callers --since <yyyy-mm-dd> [--repos <a,b>] [--workflow <name>] [--scan <n>]"
  echo "   ├─ inputs"
  echo "   │  ├─ --since     an iso date; runs created on or after it (required)"
  echo "   │  ├─ --repos     a comma list of ehmpathy repos (default: the six that declare ANTHROPIC_API_KEY)"
  echo "   │  ├─ --workflow  the workflow name to count (default: test)"
  echo "   │  └─ --scan      how many of the newest failed runs per repo to scan for the markers (default: 5)"
  echo "   ├─ guarantee"
  echo "   │  ├─ read only; it writes no file and changes no run"
  echo "   │  ├─ a success run leaves no failed-job log, so its api use is reported unseen, never zero"
  echo "   │  ├─ a failed run whose log cannot be read is counted apart, never as a run with no marker"
  echo "   │  └─ exit 0 = measured · 1 = malfunction · 2 = bad input"
  echo "   └─ example"
  echo "      ├─ rhx anthropic.ci.callers --since 2026-10-18"
  echo "      ├─ rhx anthropic.ci.callers --since 2026-10-18 --repos rhachet,rhachet-roles-bhrain"
  echo "      └─ rhx anthropic.ci.callers --since 2026-10-18 --workflow test --scan 5"
}

# refuse a flag that ends the args with no value
need_value() {
  [[ "$2" -ge 2 ]] || refuse "$1 needs a value" "rhx anthropic.ci.callers --help"
}

# the word that agrees with a count: `1 run`, `2 runs`
word_for_count() {
  local count="" one="" many=""
  local "$@"
  if [[ "$count" -eq 1 ]]; then echo "$one"; return; fi
  echo "$many"
}

# parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill|--repo|--role) need_value "$1" "$#"; shift 2 ;;
    --) shift ;;
    --since) need_value "$1" "$#"; SINCE="$2"; shift 2 ;;
    --repos) need_value "$1" "$#"; REPOS="$2"; shift 2 ;;
    --workflow) need_value "$1" "$#"; WORKFLOW="$2"; shift 2 ;;
    --scan) need_value "$1" "$#"; SCAN="$2"; shift 2 ;;
    help|--help|-h) print_help; exit 0 ;;
    *) refuse "unknown arg '$1'" "rhx anthropic.ci.callers --help" ;;
  esac
done

# validate the input
[[ -n "$SINCE" ]] || refuse "--since is required, since it bounds the runs read" "rhx anthropic.ci.callers --since 2026-10-18"
[[ "$SINCE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || refuse "--since must be an iso date, got '$SINCE'" "rhx anthropic.ci.callers --since 2026-10-18"
[[ "$SCAN" =~ ^[0-9]+$ ]] || refuse "--scan must be a whole number, got '$SCAN'" "rhx anthropic.ci.callers --since $SINCE --scan 5"

# the two markers claude prints when it bills the api
MARKER_API_MODE='API Usage Billing'
MARKER_CREDIT='Credit balance (is )?too low'

# the most runs one list call reads; a repo at the cap may hold older runs this list never saw
RUNS_LIMIT=1000

# emit the header, on the measurement root (rule.prefer.emoji-language)
echo "🧮 anthropic.ci.callers --since $SINCE --workflow $WORKFLOW --scan $SCAN"

# measure each repo
IFS=',' read -r -a REPO_LIST <<< "$REPOS"
COUNT="${#REPO_LIST[@]}"
for index in "${!REPO_LIST[@]}"; do
  repo="${REPO_LIST[$index]}"
  branch="├─"; stem="│  "
  [[ "$index" -eq $((COUNT - 1)) ]] && { branch="└─"; stem="   "; }

  # list the runs of the workflow since the date
  # .note = gh's stderr goes to a temp file, so the json on stdout stays apart and the error
  #   header opens the output; gh's own text then rides as the cause
  list_err="$(mktemp)"
  if ! runs_json="$(gh run list --repo "ehmpathy/$repo" --workflow "$WORKFLOW" --created ">=$SINCE" --limit "$RUNS_LIMIT" \
    --json databaseId,conclusion,createdAt 2>"$list_err")"; then
      echo "💥 MalfunctionError: gh run list failed for ehmpathy/$repo" >&2
      echo "   ├─ cause" >&2
      cause_lines=()
      while IFS= read -r line; do cause_lines+=("$line"); done < "$list_err"
      [[ "${#cause_lines[@]}" -eq 0 ]] && cause_lines=("(gh printed naught)")
      for cause_index in "${!cause_lines[@]}"; do
        cause_branch="├─"
        [[ "$cause_index" -eq $((${#cause_lines[@]} - 1)) ]] && cause_branch="└─"
        echo "   │  $cause_branch ${cause_lines[$cause_index]}" >&2
      done
      echo "   └─ fix" >&2
      echo "      └─ gh auth status, then check that ehmpathy/$repo exists and has a '$WORKFLOW' workflow" >&2
      rm -f "$list_err"
      exit 1
  fi
  rm -f "$list_err"
  total="$(jq 'length' <<< "$runs_json")"
  ok="$(jq '[.[] | select(.conclusion=="success")] | length' <<< "$runs_json")"
  failed="$(jq '[.[] | select(.conclusion=="failure")] | length' <<< "$runs_json")"
  echo "   $branch $repo"
  echo "   $stem├─ $total $(word_for_count count="$total" one=run many=runs) ($ok success · $failed failure · $((total - ok - failed)) other)"
  if [[ "$total" -ge "$RUNS_LIMIT" ]]; then
    echo "   $stem├─ the list is capped at $RUNS_LIMIT runs, so any older run since $SINCE is unseen, not zero"
  fi

  # scan the newest failed runs for the two markers
  hits_api=0; hits_credit=0; scanned=0; unread=0; oldest_credit=""; unread_causes=()
  while read -r run_id created_at; do
    [[ -z "${run_id:-}" ]] && continue

    # a log that cannot be read is counted apart, with its cause, never as a run with no marker
    if ! log="$(gh run view "$run_id" --repo "ehmpathy/$repo" --log-failed 2>&1)"; then
      unread=$((unread + 1))
      unread_causes+=("run $run_id, $(head -n 1 <<< "$log")")
      continue
    fi
    scanned=$((scanned + 1))
    grep -qiE "$MARKER_API_MODE" <<< "$log" && hits_api=$((hits_api + 1))
    if grep -qiE "$MARKER_CREDIT" <<< "$log"; then
      hits_credit=$((hits_credit + 1))
      oldest_credit="$created_at"
    fi
  done < <(jq -r --argjson n "$SCAN" '[.[] | select(.conclusion=="failure")] | .[:$n] | .[] | "\(.databaseId) \(.createdAt)"' <<< "$runs_json")

  # emit the repo's findings
  echo "   $stem├─ $scanned newest failed $(word_for_count count="$scanned" one=run many=runs) scanned"
  if [[ "$unread" -gt 0 ]]; then
    echo "   $stem├─ $unread failed $(word_for_count count="$unread" one='run whose log could not be read, so its markers are' many='runs whose log could not be read, so their markers are') unseen, not zero"
    for cause_index in "${!unread_causes[@]}"; do
      cause_branch="├─"
      [[ "$cause_index" -eq $((${#unread_causes[@]} - 1)) ]] && cause_branch="└─"
      echo "   $stem│  $cause_branch ${unread_causes[$cause_index]}"
    done
  fi
  echo "   $stem├─ $hits_api of the scanned runs $(word_for_count count="$hits_api" one=shows many=show) the api-mode banner"
  echo "   $stem├─ $hits_credit of the scanned runs $(word_for_count count="$hits_credit" one=shows many=show) the credit error${oldest_credit:+ (oldest such run $oldest_credit)}"
  echo "   $stem└─ success runs leave no failed log, so their api use is unseen here"
done
