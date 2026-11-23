#!/usr/bin/env bash
######################################################################
# .what = show the log of one github actions job, as plain text
#
# .why  = show.gh.action.logs and show.gh.test.errors print an empty
#         body when a job log holds terminal escape sequences (jest
#         colors): gh refuses to print it, and those skills pass no
#         flag through. this reads the raw log via the jobs api, strips
#         the escapes, and shows the failure lines or the tail
#
# .note = interim; a passthrough belongs in show.gh.action.logs
#         (rhachet-roles-ehmpathy)
#
# usage:
#   rhx show.gh.job.log --job 119598027389                 # failure lines + tail
#   rhx show.gh.job.log --job 119598027389 --tail 400      # a longer tail
#   rhx show.gh.job.log --job 119598027389 --grep 'FAIL'   # lines that match
#   rhx show.gh.job.log --run 39708084240                  # the jobs of one run
#
# options:
#   --job    the job id, the number after /job/ in a check url (required)
#   --tail   how many last lines to show (default 120)
#   --grep   an extended regex; show only the lines that match
#
# guarantee:
#   - read only; it writes no file and changes no run
#   - exit 0 = shown · 1 = malfunction · 2 = bad input
######################################################################
set -euo pipefail

JOB=""
RUN=""
TAIL="120"
GREP=""

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
  echo "🐚 show.gh.job.log — the plain-text log of one github actions job"
  echo "   ├─ usage: rhx show.gh.job.log --job <id> [--tail <n>] [--grep '<regex>']"
  echo "   ├─ example: rhx show.gh.job.log --job 119598027389 --grep 'FAIL|✕|Error'"
  echo "   └─ exit: 0 shown, 1 malfunction, 2 bad input"
}

# parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill|--repo|--role) shift 2 ;;
    --) shift ;;
    --job) JOB="${2:-}"; shift 2 ;;
    --run) RUN="${2:-}"; shift 2 ;;
    --tail) TAIL="${2:-}"; shift 2 ;;
    --grep) GREP="${2:-}"; shift 2 ;;
    help|--help|-h) emit_help; exit 0 ;;
    *) refuse "unknown arg '$1'" "rhx show.gh.job.log --help" ;;
  esac
done

# list the jobs of one run: id, conclusion, duration, name
if [[ -n "$RUN" ]]; then
  [[ "$RUN" =~ ^[0-9]+$ ]] || refuse "--run must be a number, got '$RUN'" "--run 39708084240 (the number after /runs/ in a run url)"
  REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)" || { echo "💥 MalfunctionError: could not derive the current repo via gh" >&2; exit 1; }
  echo "🐢 heres the wave..."
  echo ""
  echo "🐚 show.gh.job.log --run $RUN"
  echo "   └─ jobs (id · conclusion · seconds · name)"
  gh api --paginate "repos/$REPO/actions/runs/$RUN/jobs?per_page=100" \
    --jq '.jobs[] | "\(.id) · \(.conclusion // .status) · \(if .completed_at and .started_at then ((.completed_at|fromdate) - (.started_at|fromdate)) else "-" end)s · \(.name)"' \
    | sed 's/^/      /' || { echo "💥 MalfunctionError: gh api could not list the jobs of run $RUN" >&2; exit 1; }
  exit 0
fi

# validate the input
[[ -n "$JOB" ]] || { emit_help; exit 0; }
[[ "$JOB" =~ ^[0-9]+$ ]] || refuse "--job must be a number, got '$JOB'" "--job 119598027389 (the number after /job/ in a check url)"
[[ "$TAIL" =~ ^[0-9]+$ ]] || refuse "--tail must be a number, got '$TAIL'" "--tail 120"

# read the raw log and strip the escapes
# .note = gh gates a body that holds escape sequences; this skill strips them before it
#   prints, so the gate is passed here and never reaches the terminal
REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)" || { echo "💥 MalfunctionError: could not derive the current repo via gh" >&2; exit 1; }
RAW="$(gh api --allow-escape-sequences "repos/$REPO/actions/jobs/$JOB/logs")" || { echo "💥 MalfunctionError: gh api could not read the log of job $JOB" >&2; exit 1; }
PLAIN="$(printf '%s\n' "$RAW" | sed -E 's/\x1B\[[0-9;?]*[A-Za-z]//g; s/\x1B\][^\x07]*\x07//g; s/\r$//')"
LINES="$(printf '%s\n' "$PLAIN" | wc -l | tr -d ' ')"

# emit the header
echo "🐢 heres the wave..."
echo ""
echo "🐚 show.gh.job.log --job $JOB"
echo "   ├─ repo = $REPO"
echo "   ├─ $LINES lines"

# emit the lines asked for
if [[ -n "$GREP" ]]; then
  echo "   └─ lines that match '$GREP'"
  printf '%s\n' "$PLAIN" | grep -nE "$GREP" | sed 's/^/      /' || echo "      (none)"
  exit 0
fi
echo "   ├─ failure lines"
printf '%s\n' "$PLAIN" | grep -nE '##\[error\]|✕|● |FAIL |Error:|ERR!|exit code [1-9]' | head -n 60 | sed 's/^/      /' || echo "      (none)"
echo "   └─ last $TAIL lines"
printf '%s\n' "$PLAIN" | tail -n "$TAIL" | sed 's/^/      /'
