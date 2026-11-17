#!/usr/bin/env bash
######################################################################
# 🧮 boot.adherence.probe — does a clone follow a brief its boot carries?
#
# .what = run one prompt N times as fresh one-shot clones, and count the
#         replies that hold an expected marker — a reply a brief dictates
#
# .why  = the boot reaches a clone as its system prompt, with no memory
#         wrapper and no OVERRIDE line. a count of dictated replies is the
#         measure that the briefs still bind; one reply is a sample of one
#
# usage:
#   run `rhx boot.adherence.probe help` — `show_help()` below is the one source
#
# guarantee:
#   - each trial is a fresh `rhx enroll claude -p` session
#   - exit 0 = measured, 1 = a trial failed, 2 = bad input
#
# .note = the domain-root 🧮 roots every line; no role mascot (rule.prefer.emoji-language)
######################################################################
set -euo pipefail

ORIGINAL_ARGS=("$@")

# ONE help text, reached from both call sites (a direct call, and an `rhx` call)
show_help() {
  echo "🧮 boot.adherence.probe — does a clone follow a brief its boot carries?"
  echo "   ├─ usage"
  echo "   │  └─ rhx boot.adherence.probe --prompt <text> --expect <text> [--trials <n>] [--roles <spec>] [--model <model>]"
  echo "   ├─ options"
  echo "   │  ├─ --prompt   the ask each trial sends"
  echo "   │  ├─ --expect   the text a reply must hold to count as adherent (a fixed string)"
  echo "   │  ├─ --trials   how many fresh sessions; 5 when absent"
  echo "   │  ├─ --roles    the --roles spec passed to rhx enroll; -driver when absent"
  echo "   │  └─ --model    the brain model; haiku when absent"
  echo "   ├─ exits"
  echo "   │  ├─ 0 = measured"
  echo "   │  ├─ 1 = a trial failed to return a reply"
  echo "   │  └─ 2 = bad input"
  echo "   ├─ examples"
  echo "   │  └─ rhx boot.adherence.probe --prompt '<an ask a brief dictates the reply to>' --expect '<the text that brief dictates>'"
  echo "   └─ spends real tokens — one short -p call per trial"
  exit 0
}

# emit one qualified error tree on stderr, then exit with the code its class carries
# named args (rule.forbid.positional-args): kind=<constraint|malfunction> what=<text> [hint=<text>] [detail=<text>]
fail() {
  local kind="" what="" hint="" detail="" arg
  for arg in "$@"; do
    case "$arg" in
      kind=*) kind="${arg#kind=}" ;;
      what=*) what="${arg#what=}" ;;
      hint=*) hint="${arg#hint=}" ;;
      detail=*) detail="${arg#detail=}" ;;
    esac
  done
  local header="💥 MalfunctionError: $what"
  local code=1
  if [[ "$kind" == "constraint" ]]; then
    header="✋ ConstraintError: $what"
    code=2
  fi
  echo "🧮 boot.adherence.probe" >&2
  echo "   ├─ ran = rhx boot.adherence.probe${ORIGINAL_ARGS[*]:+ ${ORIGINAL_ARGS[*]}}" >&2
  echo "   ├─ $header" >&2
  if [[ -n "$detail" ]]; then
    echo "   ├─ detail" >&2
    printf '%s\n' "$detail" | tail -n 20 | while IFS= read -r ROW; do
      echo "   │  │ $ROW" >&2
    done
  fi
  echo "   └─ hint = ${hint:-rhx boot.adherence.probe help}" >&2
  # literal exits, so a reader (and the unknown-flag clamp) sees this never returns
  [[ "$code" -eq 2 ]] && exit 2
  exit 1
}

# belay when a flag's value is absent or is itself a flag
# named args: flag=<name> value=<candidate>
require_val() {
  local flag="" value="" arg
  for arg in "$@"; do
    case "$arg" in
      flag=*) flag="${arg#flag=}" ;;
      value=*) value="${arg#value=}" ;;
    esac
  done
  if [[ -z "$value" || "$value" == --* ]]; then
    fail kind=constraint what="absent value for $flag"
  fi
}

# help, ahead of the loop — for a direct call where `help` is the first token
if [[ "${1:-}" == "help" || "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  show_help
fi

PROMPT=""
EXPECT=""
TRIALS=5
ROLES="-driver"
MODEL="haiku"

while [[ $# -gt 0 ]]; do
  case $1 in
    --prompt)
      require_val flag=--prompt value="${2:-}"
      PROMPT="$2"
      shift 2
      ;;
    --expect)
      require_val flag=--expect value="${2:-}"
      EXPECT="$2"
      shift 2
      ;;
    --trials)
      require_val flag=--trials value="${2:-}"
      if [[ ! "$2" =~ ^[1-9][0-9]*$ ]]; then
        fail kind=constraint what="invalid --trials value $2" hint="pass a positive integer, e.g. --trials 5"
      fi
      TRIALS="$2"
      shift 2
      ;;
    --roles)
      require_val flag=--roles value="${2:-}"
      ROLES="$2"
      shift 2
      ;;
    --model)
      require_val flag=--model value="${2:-}"
      MODEL="$2"
      shift 2
      ;;
    --skill|--repo|--role)
      # rhachet prepends these; the guard keeps `shift 2` from a silent exit past the end
      require_val flag="$1" value="${2:-}"
      shift 2
      ;;
    --)
      shift
      ;;
    help|--help|-h)
      show_help
      ;;
    *)
      fail kind=constraint what="unknown argument $1"
      ;;
  esac
done

if [[ -z "$PROMPT" || -z "$EXPECT" ]]; then
  fail kind=constraint what="--prompt and --expect are both required" hint="rhx boot.adherence.probe --prompt '<an ask a brief dictates the reply to>' --expect '<the text that brief dictates>'"
fi

# one fresh log dir per run; the pid keeps two runs in one second apart
LOGDIR=".log/role=any/skill=boot.adherence.probe/$(date -u +%Y%m%dT%H%M%SZ).$$"
mkdir -p "$LOGDIR"

echo "🧮 boot.adherence.probe --roles '$ROLES' --model $MODEL --trials $TRIALS"
echo "   ├─ prompt = $PROMPT"
echo "   ├─ expect = $EXPECT"
echo "   ├─ trials"
HITS=0
for (( I = 1; I <= TRIALS; I++ )); do
  # one fresh one-shot session; its whole output lands in the log
  LOG="$LOGDIR/trial.$I.log"
  STATUS=0
  npx rhx enroll claude --roles "$ROLES" -p "$PROMPT" --model "$MODEL" --output-format json >"$LOG" 2>&1 || STATUS=$?
  # an enroll refusal (exit 2) is the caller's to fix, any other fault is not
  if [[ "$STATUS" -eq 2 ]]; then
    fail kind=constraint what="trial $I enroll refused its args" detail="$(cat "$LOG")" hint="the full output is at $LOG"
  fi
  if [[ "$STATUS" -ne 0 ]]; then
    fail kind=malfunction what="trial $I failed, exit $STATUS" detail="$(cat "$LOG")" hint="the full output is at $LOG"
  fi

  # the reply is the .result of the one json object the brain-cli emits with type=result.
  #   a log with no json line is no grep fault: it reaches the named "no reply" branch below
  #   `fromjson?` skips a line that is not json, by name; a fault of jq itself still fails loud
  RESULT=""
  if ! RESULT=$(jq -c -R 'fromjson? | select(type == "object" and .type == "result")' "$LOG" 2>&1 | tail -n 1); then
    fail kind=malfunction what="trial $I output could not be scanned for its result json" detail="$RESULT" hint="the full output is at $LOG"
  fi
  REPLY=""
  [[ -n "$RESULT" ]] && REPLY=$(printf '%s' "$RESULT" | jq -r '.result // empty')
  if [[ -z "$REPLY" ]]; then
    fail kind=malfunction what="trial $I returned no reply" detail="$(cat "$LOG")" hint="the full output is at $LOG"
  fi

  HOLDS="✗"
  if [[ "$REPLY" == *"$EXPECT"* ]]; then
    HOLDS="✓"
    HITS=$((HITS + 1))
  fi
  GLYPH="├─"
  (( I == TRIALS )) && GLYPH="└─"
  echo "   │  $GLYPH [$I] $HOLDS $(printf '%s' "$REPLY" | tr '\n' ' ' | cut -c1-70)"
done
echo "   │"
echo "   ├─ logs = $LOGDIR"
echo "   └─ $HITS of $TRIALS replies hold the expected text"
