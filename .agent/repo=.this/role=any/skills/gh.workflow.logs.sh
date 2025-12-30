#!/usr/bin/env bash
######################################################################
# .what = fetch logs from the latest test workflow run on current branch
#
# .why  = enables quick access to CI logs without leaving the terminal
#         - diagnose failing tests faster
#         - review workflow output during development
#         - avoid context-switching to browser
#
# usage:
#   gh.workflow.logs.sh --workflow "test"            # failed logs from latest test run
#   gh.workflow.logs.sh --workflow "ci" --full       # show full logs (not just failed)
#   gh.workflow.logs.sh --run-id 12345678            # view specific run by id
#   gh.workflow.logs.sh --workflow "test" --watch    # watch in-progress run
#   gh.workflow.logs.sh --workflow "test" --web      # open in browser instead
#
# guarantee:
#   - uses gh cli (must be authenticated)
#   - defaults to current branch
#   - shows most recent run if no run-id specified
#   - fail-fast on errors
######################################################################
set -euo pipefail

# disable pager for gh commands
export GH_PAGER=""

# parse named arguments
WORKFLOW=""
RUN_ID=""
FULL_LOGS=false
WATCH_MODE=false
WEB_MODE=false
BRANCH=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --workflow|-w)
      WORKFLOW="$2"
      shift 2
      ;;
    --run-id|-r)
      RUN_ID="$2"
      shift 2
      ;;
    --full)
      FULL_LOGS=true
      shift
      ;;
    --watch)
      WATCH_MODE=true
      shift
      ;;
    --web)
      WEB_MODE=true
      shift
      ;;
    --branch|-b)
      BRANCH="$2"
      shift 2
      ;;
    --help|-h)
      echo "usage: gh.workflow.logs.sh --workflow <name> [options]"
      echo ""
      echo "required:"
      echo "  --workflow, -w <name>   workflow name (e.g., 'test', 'ci')"
      echo ""
      echo "options:"
      echo "  --run-id, -r <id>       view specific run by id (skips workflow lookup)"
      echo "  --full                  show full logs (default: failed only)"
      echo "  --watch                 watch in-progress run"
      echo "  --web                   open in browser instead of terminal"
      echo "  --branch, -b <name>     use specific branch (default: current)"
      echo "  --help, -h              show this help"
      exit 0
      ;;
    *)
      echo "unknown argument: $1"
      echo "run with --help for usage"
      exit 1
      ;;
  esac
done

# require workflow unless run-id specified
if [[ -z "$WORKFLOW" && -z "$RUN_ID" ]]; then
  echo "error: --workflow is required"
  echo "usage: gh.workflow.logs.sh --workflow <name> [options]"
  echo "run with --help for more info"
  exit 1
fi

# ensure gh cli is available
if ! command -v gh &> /dev/null; then
  echo "error: gh cli is not installed"
  echo "install: https://cli.github.com/"
  exit 1
fi

# ensure we're authenticated
if ! gh auth status &> /dev/null; then
  echo "error: not authenticated with gh cli"
  echo "run: gh auth login"
  exit 1
fi

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository"
  exit 1
fi

# get current branch if not specified
if [[ -z "$BRANCH" ]]; then
  BRANCH=$(git branch --show-current)
  if [[ -z "$BRANCH" ]]; then
    echo "error: could not determine current branch (detached HEAD?)"
    exit 1
  fi
fi

echo ":: branch: $BRANCH"

# if run-id specified, use it directly
if [[ -n "$RUN_ID" ]]; then
  echo ":: run-id: $RUN_ID"
else
  # build gh run list command
  LIST_CMD="gh run list --branch $BRANCH --limit 1 --json databaseId,workflowName,status,conclusion,createdAt"

  if [[ -n "$WORKFLOW" ]]; then
    LIST_CMD="$LIST_CMD --workflow $WORKFLOW"
  fi

  # get latest run
  RUNS_JSON=$(eval "$LIST_CMD")

  if [[ "$RUNS_JSON" == "[]" ]]; then
    echo ""
    echo "no workflow runs found for branch: $BRANCH"
    if [[ -n "$WORKFLOW" ]]; then
      echo "with workflow filter: $WORKFLOW"
    fi
    echo ""
    echo "available workflows:"
    gh workflow list
    exit 1
  fi

  # extract run info
  RUN_ID=$(echo "$RUNS_JSON" | jq -r '.[0].databaseId')
  WORKFLOW_NAME=$(echo "$RUNS_JSON" | jq -r '.[0].workflowName')
  STATUS=$(echo "$RUNS_JSON" | jq -r '.[0].status')
  CONCLUSION=$(echo "$RUNS_JSON" | jq -r '.[0].conclusion')
  CREATED_AT=$(echo "$RUNS_JSON" | jq -r '.[0].createdAt')

  echo ":: workflow: $WORKFLOW_NAME"
  echo ":: run-id: $RUN_ID"
  echo ":: status: $STATUS"
  if [[ "$CONCLUSION" != "null" ]]; then
    echo ":: conclusion: $CONCLUSION"
  fi
  echo ":: created: $CREATED_AT"
fi

echo ""

# handle watch mode
if [[ "$WATCH_MODE" == "true" ]]; then
  echo ":: watching run $RUN_ID ..."
  gh run watch "$RUN_ID"
  exit 0
fi

# handle web mode
if [[ "$WEB_MODE" == "true" ]]; then
  echo ":: opening in browser ..."
  gh run view "$RUN_ID" --web
  exit 0
fi

# get repo info for api calls
REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')

# get jobs for this run
JOBS_JSON=$(gh api --method GET "repos/$REPO/actions/runs/$RUN_ID/jobs" -q '.jobs')

# get only failed job ids
FAILED_JOB_IDS=$(echo "$JOBS_JSON" | jq -r '.[] | select(.conclusion == "failure") | .id')
if [[ -z "$FAILED_JOB_IDS" ]]; then
  echo "no failed jobs found"
  exit 0
fi

# view logs
for JOB_ID in $FAILED_JOB_IDS; do
  JOB_NAME=$(echo "$JOBS_JSON" | jq -r ".[] | select(.id == $JOB_ID) | .name")
  echo "=== $JOB_NAME (failed) ==="
  if [[ "$FULL_LOGS" == "true" ]]; then
    # show full logs for failed job
    gh api --method GET "repos/$REPO/actions/jobs/$JOB_ID/logs"
  else
    # capture error sections: from FAIL until next PASS or test summary
    gh api --method GET "repos/$REPO/actions/jobs/$JOB_ID/logs" | awk '
      /FAIL / { printing=1 }
      /PASS |Ran all test suites/ { printing=0 }
      printing { print }
    '
  fi
  echo ""
done
