#!/usr/bin/env bash
######################################################################
# 🧮 boot.compact.probe — does a live clone re-read its boot on /compact?
#
# .what = spawn one live clone that logs its raw api request bodies, add a
#         sentinel line to its actor's boot.md after spawn, run /compact,
#         then send one more turn. report, per request, whether the system
#         block holds the sentinel
#
# .why  = the boot reaches a clone as --system-prompt-file. whether a
#         compaction re-reads that file decides when a boot edit reaches a
#         live clone: at the next /compact, or only at the next spawn. the
#         raw request is the record; a brain's self-report is no measure
#
# usage:
#   run `rhx boot.compact.probe help` — `show_help()` below is the one source
#
# guarantee:
#   - the actor's boot.md is restored byte-for-byte on every exit
#   - the probe clone is sent /exit on every exit
#   - exit 0 = measured, 1 = the measure failed, 2 = bad input
#
# .note = the domain-root 🧮 roots every line; no role mascot (rule.prefer.emoji-language)
######################################################################
set -euo pipefail

ORIGINAL_ARGS=("$@")

# ONE help text, reached from both call sites (a direct call, and an `rhx` call)
show_help() {
  echo "🧮 boot.compact.probe — does a live clone re-read its boot on /compact?"
  echo "   ├─ usage"
  echo "   │  └─ rhx boot.compact.probe [--roles <spec>] [--model <model>]"
  echo "   ├─ options"
  echo "   │  ├─ --roles    the --roles spec passed to rhx enroll; -driver when absent"
  echo "   │  └─ --model    the brain model; haiku when absent"
  echo "   ├─ exits"
  echo "   │  ├─ 0 = measured, and the verdict is ✓ or ✗"
  echo "   │  ├─ 1 = the measure failed — no clone, no request bodies, or a wait ran out"
  echo "   │  └─ 2 = bad input"
  echo "   ├─ examples"
  echo "   │  ├─ rhx boot.compact.probe"
  echo "   │  └─ rhx boot.compact.probe --model sonnet"
  echo "   └─ spends real tokens — two short turns and one compaction"
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
  echo "🧮 boot.compact.probe" >&2
  echo "   ├─ ran = rhx boot.compact.probe${ORIGINAL_ARGS[*]:+ ${ORIGINAL_ARGS[*]}}" >&2
  echo "   ├─ $header" >&2
  if [[ -n "$detail" ]]; then
    echo "   ├─ detail" >&2
    printf '%s\n' "$detail" | tail -n 20 | while IFS= read -r ROW; do
      echo "   │  │ $ROW" >&2
    done
  fi
  echo "   └─ hint = ${hint:-rhx boot.compact.probe help}" >&2
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
LOGDIR="$PWD/.log/role=any/skill=boot.compact.probe/$RUN"
OTEL="$LOGDIR/otel"
mkdir -p "$OTEL"
SLUG="compactprobe-$$"
SENTINEL="KELP-$$-TIDE"
BOOT=""

# on every exit: send /exit to the clone, and put the actor's boot.md back as it was
cleanup() {
  npx rhx clone say "@:$SLUG" --what /exit >/dev/null 2>&1 || true
  if [[ -n "$BOOT" && -f "$LOGDIR/boot.md.before" ]]; then
    cp "$LOGDIR/boot.md.before" "$BOOT"
  fi
}
trap cleanup EXIT

# the count of requests the clone has sent so far; reads $OTEL
rows_now() {
  if [[ ! -f "$OTEL/index.jsonl" ]]; then
    echo 0
    return 0
  fi
  awk 'NF' "$OTEL/index.jsonl" | wc -l | tr -d ' '
}

# wait until the clone has sent more than `after` requests, then settle until the count holds
# .note = named args: after=<n> what=<label>
await_rows() {
  local after="" what="" arg
  for arg in "$@"; do
    case "$arg" in
      after=*) after="${arg#after=}" ;;
      what=*) what="${arg#what=}" ;;
    esac
  done
  local deadline=$((SECONDS + 180))
  while (( $(rows_now) <= after )); do
    if (( SECONDS > deadline )); then
      fail kind=malfunction what="no request after $what within 180s" hint="read the clone with rhx clone get @:$SLUG --tail 10"
    fi
    sleep 1
  done
  # a turn may send more than one request; settle until the count holds for 5s
  local held=0
  local seen
  seen=$(rows_now)
  while (( held < 5 )); do
    sleep 1
    if (( $(rows_now) == seen )); then
      held=$((held + 1))
      continue
    fi
    seen=$(rows_now)
    held=0
  done
}

# send one message, wait for its requests to land, and print the request count before it
# .note = named args: what=<message> label=<label>
say_and_await() {
  local what="" label="" arg
  for arg in "$@"; do
    case "$arg" in
      what=*) what="${arg#what=}" ;;
      label=*) label="${arg#label=}" ;;
    esac
  done
  local before
  before=$(rows_now)
  local out="" status=0
  out=$(npx rhx clone say "@:$SLUG" --what "$what" --await release 2>&1) || status=$?
  # a refusal (exit 2) is the caller's to fix, any other fault is not
  if [[ "$status" -eq 2 ]]; then
    fail kind=constraint what="the say of $label was refused" detail="$out"
  fi
  if [[ "$status" -ne 0 ]]; then
    fail kind=malfunction what="the say of $label did not reach the clone, exit $status" detail="$out"
  fi
  await_rows after="$before" what="$label"
  echo "$before"
}

# spawn the clone, with its raw request bodies logged
ENROLLED=""
ENROLL_STATUS=0
ENROLLED=$(OTEL_LOG_RAW_API_BODIES="file:$OTEL" npx rhx enroll claude --as "@:$SLUG" --roles "$ROLES" --async --model "$MODEL" 2>&1) || ENROLL_STATUS=$?
# an enroll refusal (exit 2) is the caller's to fix, any other fault is not
if [[ "$ENROLL_STATUS" -eq 2 ]]; then
  fail kind=constraint what="the probe enroll refused its args" detail="$ENROLLED"
fi
if [[ "$ENROLL_STATUS" -ne 0 ]]; then
  fail kind=malfunction what="the probe clone did not enroll, exit $ENROLL_STATUS" detail="$ENROLLED"
fi

# the actor dir that holds the clone: the clone whose identity.json names this slug
for IDENTITY in .agent/.actors/*/clones/serial=*/identity.json; do
  [[ -f "$IDENTITY" ]] || continue
  # an unreadable identity fails loud, never reads as another clone's
  IDENTITY_SLUG=""
  if ! IDENTITY_SLUG=$(jq -r '.slug // empty' "$IDENTITY" 2>&1); then
    fail kind=malfunction what="a clone identity could not be parsed as json" detail="$IDENTITY_SLUG" hint="the identity is at $IDENTITY"
  fi
  if [[ "$IDENTITY_SLUG" == "$SLUG" ]]; then
    BOOT="$(dirname "$(dirname "$(dirname "$IDENTITY")")")/brain/.claude/boot.md"
  fi
done
if [[ -z "$BOOT" || ! -f "$BOOT" ]]; then
  fail kind=malfunction what="the probe clone's actor boot.md could not be found" detail="$ENROLLED"
fi
cp "$BOOT" "$LOGDIR/boot.md.before"

# the requests a clone sends before any say: settle 15s, then count them
sleep 15
AT_SPAWN=$(rows_now)

# turn 1, at spawn: the boot as the clone read it
say_and_await what="Do not use any tools. Reply with exactly: OK" label="turn 1" >/dev/null

# the edit after spawn: one sentinel line at the end of the boot
printf '\nthe compact probe sentinel is %s.\n' "$SENTINEL" >> "$BOOT"

# /compact, then one more turn: the request after the compaction is the one that matters
COMPACT_AT=$(say_and_await what="/compact" label="/compact")
AFTER_AT=$(say_and_await what="Do not use any tools. Reply with exactly: OK" label="turn 2")

# per request, in send order: does its system block hold the sentinel? each read fails loud, so
#   a fault never counts as a request without the sentinel
N=0
VERDICT_HOLDS=""
TOTAL=$(rows_now)
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
  PHASE="spawn, before any say"
  if (( N > AT_SPAWN )); then PHASE="turn 1"; fi
  if (( N > COMPACT_AT )); then PHASE="/compact"; fi
  if (( N > AFTER_AT )); then PHASE="turn 2"; fi
  HOLDS=""
  if ! HOLDS=$(jq -r --arg s "$SENTINEL" '(.system | tostring) | contains($s) | if . then "yes" else "no" end' "$OTEL/$FILE" 2>&1); then
    fail kind=malfunction what="request body $N could not be parsed as json" detail="$HOLDS"
  fi
  # the last text the request carries, so the compaction request reads as one
  ASK=""
  if ! ASK=$(jq -r '
      [ .messages[-1].content | if type == "string" then . else (.[] | select(.type == "text") | .text) end ]
      | last // "" | gsub("\\s+"; " ") | .[0:60]' "$OTEL/$FILE" 2>&1); then
    fail kind=malfunction what="request body $N holds no readable messages" detail="$ASK"
  fi
  ROWS_OUT+="   │  $GLYPH [$N] $PHASE · system holds the sentinel = $HOLDS · asks \"$ASK\""$'\n'
  if [[ "$PHASE" == "turn 2" ]]; then VERDICT_HOLDS="$HOLDS"; fi
done < "$OTEL/index.jsonl"

# a void measure fails before the tree opens, so stdout never holds a tree with no verdict
# .note = the await after turn 2 holds a row past AFTER_AT, so this guards an invariant the
#   await already keeps; it fails loud should the index shrink under the read
if [[ -z "$VERDICT_HOLDS" ]]; then
  fail kind=malfunction what="no request after the compaction was logged" hint="read the clone with rhx clone get @:$SLUG --tail 10"
fi

echo "🧮 boot.compact.probe --roles '$ROLES' --model $MODEL"
echo "   ├─ the sentinel line lands in boot.md after spawn, before /compact"
echo "   ├─ requests, in send order"
printf '%s' "$ROWS_OUT"
echo "   │"
echo "   ├─ request bodies = .log/role=any/skill=boot.compact.probe/$RUN/otel"
if [[ "$VERDICT_HOLDS" == "yes" ]]; then
  echo "   └─ ✓ /compact re-read the boot; a live clone meets a boot edit at its next compaction"
  exit 0
fi
echo "   └─ ✗ /compact kept the spawn boot; a live clone meets a boot edit only at its next spawn"