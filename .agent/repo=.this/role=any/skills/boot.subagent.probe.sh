#!/usr/bin/env bash
######################################################################
# 🧮 boot.subagent.probe — does a clone's subagent boot with the clone's boot?
#
# .what = one -p turn that asks the clone to hand a task to a subagent.
#         report, per raw request, whether its system block carries the
#         boot (a `<brief.say` line), so the clone's requests and the
#         subagent's read apart
#
# .why  = the boot reaches a clone as its system prompt. a subagent the
#         clone spawns opens its own requests; whether those carry the
#         boot decides whether a subagent heeds the briefs and whether it
#         reads the boot from cache. the raw request is the record
#
# usage:
#   run `rhx boot.subagent.probe help` — `show_help()` below is the one source
#
# guarantee:
#   - exit 0 = measured, 1 = the measure failed, 2 = bad input
#
# .note = the domain-root 🧮 roots every line; no role mascot (rule.prefer.emoji-language)
######################################################################
set -euo pipefail

ORIGINAL_ARGS=("$@")

# the marker every rendered boot holds, and no vendor prompt does
BOOT_MARKER="<brief.say path="

# ONE help text, reached from both call sites (a direct call, and an `rhx` call)
show_help() {
  echo "🧮 boot.subagent.probe — does a clone's subagent boot with the clone's boot?"
  echo "   ├─ usage"
  echo "   │  └─ rhx boot.subagent.probe [--roles <spec>] [--model <model>]"
  echo "   ├─ options"
  echo "   │  ├─ --roles    the --roles spec passed to rhx enroll; -driver when absent"
  echo "   │  └─ --model    the brain model; haiku when absent"
  echo "   ├─ exits"
  echo "   │  ├─ 0 = measured"
  echo "   │  ├─ 1 = the measure failed — no request bodies, or no subagent ran"
  echo "   │  └─ 2 = bad input"
  echo "   ├─ examples"
  echo "   │  └─ rhx boot.subagent.probe"
  echo "   └─ spends real tokens — one -p turn and one subagent task"
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
  echo "🧮 boot.subagent.probe" >&2
  echo "   ├─ ran = rhx boot.subagent.probe${ORIGINAL_ARGS[*]:+ ${ORIGINAL_ARGS[*]}}" >&2
  echo "   ├─ $header" >&2
  if [[ -n "$detail" ]]; then
    echo "   ├─ detail" >&2
    printf '%s\n' "$detail" | tail -n 20 | while IFS= read -r ROW; do
      echo "   │  │ $ROW" >&2
    done
  fi
  echo "   └─ hint = ${hint:-rhx boot.subagent.probe help}" >&2
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

ROLES="-driver"
MODEL="haiku"

while [[ $# -gt 0 ]]; do
  case $1 in
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

# one fresh log dir per run; the pid keeps two runs in one second apart
RUN="$(date -u +%Y%m%dT%H%M%SZ).$$"
LOGDIR="$PWD/.log/role=any/skill=boot.subagent.probe/$RUN"
OTEL="$LOGDIR/otel"
mkdir -p "$OTEL"

# one -p turn that hands one task to a subagent, raw request bodies logged
ASK="Use the Agent tool once, with subagent_type general-purpose, to ask a subagent to reply with exactly: PONG. Use no other tool. Then reply with exactly: DONE"
STATUS=0
OTEL_LOG_RAW_API_BODIES="file:$OTEL" npx rhx enroll claude --roles "$ROLES" -p "$ASK" --model "$MODEL" --output-format json >"$LOGDIR/turn.log" 2>&1 || STATUS=$?
# an enroll refusal (exit 2) is the caller's to fix, any other fault is not
if [[ "$STATUS" -eq 2 ]]; then
  fail kind=constraint what="the probe enroll refused its args" detail="$(cat "$LOGDIR/turn.log")" hint="the full output is at $LOGDIR/turn.log"
fi
if [[ "$STATUS" -ne 0 ]]; then
  fail kind=malfunction what="the probe turn failed, exit $STATUS" detail="$(cat "$LOGDIR/turn.log")" hint="the full output is at $LOGDIR/turn.log"
fi
if [[ ! -f "$OTEL/index.jsonl" ]]; then
  fail kind=malfunction what="no raw request bodies under $OTEL" hint="the brain-cli writes them only when OTEL_LOG_RAW_API_BODIES=file:<dir> reaches it"
fi

# per request, in send order: does its system carry the boot? each read fails loud, so a fault
#   never counts as a request without the boot
TOTAL=$(awk 'NF' "$OTEL/index.jsonl" | wc -l | tr -d ' ')
N=0
WITH=0
WITHOUT=0
ROWS_OUT=""
while IFS= read -r ROW; do
  [[ -z "$ROW" ]] && continue
  N=$((N + 1))
  GLYPH="├─"
  (( N == TOTAL )) && GLYPH="└─"
  FILE=""
  if ! FILE=$(printf '%s' "$ROW" | jq -r '.request_file // empty' 2>&1) || [[ -z "$FILE" || ! -f "$OTEL/$FILE" ]]; then
    fail kind=malfunction what="request row $N names no readable body file" detail="$ROW"
  fi
  CARRIES=""
  if ! CARRIES=$(jq -r --arg m "$BOOT_MARKER" '(.system | tostring) | contains($m) | if . then "yes" else "no" end' "$OTEL/$FILE" 2>&1); then
    fail kind=malfunction what="request body $N could not be parsed as json" detail="$CARRIES"
  fi
  if [[ "$CARRIES" == "yes" ]]; then WITH=$((WITH + 1)); else WITHOUT=$((WITHOUT + 1)); fi
  SYSTEM_SIZE=""
  if ! SYSTEM_SIZE=$(jq -r '(.system | tostring) | length' "$OTEL/$FILE" 2>&1); then
    fail kind=malfunction what="request body $N could not be parsed as json" detail="$SYSTEM_SIZE"
  fi
  ROWS_OUT+="   │  $GLYPH [$N] system carries the boot = $CARRIES · system chars = $SYSTEM_SIZE"$'\n'
done < "$OTEL/index.jsonl"

# a void measure fails before the tree opens, so stdout never holds a tree with no verdict
if (( WITH == 0 )); then
  fail kind=malfunction what="no request carried the boot, so the clone's own turn is absent" hint="read $LOGDIR/turn.log"
fi
if (( WITHOUT == 0 )); then
  fail kind=malfunction what="every request carried the boot, so no subagent request was told apart" hint="did the subagent run? read $LOGDIR/turn.log"
fi

echo "🧮 boot.subagent.probe --roles '$ROLES' --model $MODEL"
echo "   ├─ requests, in send order"
printf '%s' "$ROWS_OUT"
echo "   │"
echo "   ├─ request bodies = .log/role=any/skill=boot.subagent.probe/$RUN/otel"
echo "   └─ $WITH request(s) carry the boot, $WITHOUT do not; a request without it is the subagent's own prompt"
