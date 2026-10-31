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
  echo "   └─ fix: $2" >&2
  exit 2
}

# parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill|--repo|--role) shift 2 ;;
    --) shift ;;
    --since) SINCE="${2:-}"; shift 2 ;;
    --repos) REPOS="${2:-}"; shift 2 ;;
    --workflow) WORKFLOW="${2:-}"; shift 2 ;;
    --scan) SCAN="${2:-}"; shift 2 ;;
    help|--help|-h) sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) refuse "unknown arg '$1'" "rhx anthropic.ci.callers --help" ;;
  esac
done

# validate the input
[[ "$SINCE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || refuse "--since must be an iso date, got '$SINCE'" "rhx anthropic.ci.callers --since 2026-10-18"
[[ "$SCAN" =~ ^[0-9]+$ ]] || refuse "--scan must be a whole number, got '$SCAN'" "--scan 5"

# the two markers claude prints when it bills the api
MARKER_API_MODE='API Usage Billing'
MARKER_CREDIT='Credit balance (is )?too low'

# emit the header
echo "🐢 lets count the callers..."
echo ""
echo "🐚 anthropic.ci.callers --since $SINCE --workflow $WORKFLOW --scan $SCAN"

# measure each repo
IFS=',' read -r -a REPO_LIST <<< "$REPOS"
COUNT="${#REPO_LIST[@]}"
for index in "${!REPO_LIST[@]}"; do
  repo="${REPO_LIST[$index]}"
  branch="├─"; stem="│  "
  [[ "$index" -eq $((COUNT - 1)) ]] && { branch="└─"; stem="   "; }

  # list the runs of the workflow since the date
  runs_json="$(gh run list --repo "ehmpathy/$repo" --workflow "$WORKFLOW" --created ">=$SINCE" --limit 1000 \
    --json databaseId,conclusion,createdAt)" || { echo "💥 MalfunctionError: gh run list failed for ehmpathy/$repo" >&2; exit 1; }
  total="$(jq 'length' <<< "$runs_json")"
  ok="$(jq '[.[] | select(.conclusion=="success")] | length' <<< "$runs_json")"
  failed="$(jq '[.[] | select(.conclusion=="failure")] | length' <<< "$runs_json")"
  echo "   $branch $repo"
  echo "   $stem├─ $total runs ($ok success · $failed failure · $((total - ok - failed)) other)"

  # scan the newest failed runs for the two markers
  hits_api=0; hits_credit=0; scanned=0; oldest_credit=""
  while read -r run_id created_at; do
    [[ -z "${run_id:-}" ]] && continue
    scanned=$((scanned + 1))
    log="$(gh run view "$run_id" --repo "ehmpathy/$repo" --log-failed 2>/dev/null || true)"
    grep -qiE "$MARKER_API_MODE" <<< "$log" && hits_api=$((hits_api + 1))
    if grep -qiE "$MARKER_CREDIT" <<< "$log"; then
      hits_credit=$((hits_credit + 1))
      oldest_credit="$created_at"
    fi
  done < <(jq -r --argjson n "$SCAN" '[.[] | select(.conclusion=="failure")] | .[:$n] | .[] | "\(.databaseId) \(.createdAt)"' <<< "$runs_json")

  # emit the repo's findings
  echo "   $stem├─ $scanned newest failed runs scanned"
  echo "   $stem├─ $hits_api show the api-mode banner"
  echo "   $stem├─ $hits_credit show the credit error${oldest_credit:+ (oldest such run $oldest_credit)}"
  echo "   $stem└─ success runs leave no failed log, so their api use is unseen here"
done
