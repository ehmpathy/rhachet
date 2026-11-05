#!/usr/bin/env bash
######################################################################
# 🧮 boot.resume.probe — does a resumed session boot with the boot of today?
#
# .what = open one -p session, add a sentinel line to a brief the boot
#         carries, then --resume that session. report whether the resumed
#         request's system block holds the sentinel
#
# .why  = a resume re-spawns the brain-cli with a fresh --system-prompt-file.
#         whether that file, or the prompt the session first recorded, is
#         what the resumed request sends decides whether a boot edit reaches
#         a resumed session. the raw request is the record; a brain's
#         self-report is no measure
#
# usage:
#   run `rhx boot.resume.probe help` — `show_help()` below is the one source
#
# guarantee:
#   - the brief is restored byte-for-byte on every exit
#   - a sentinel a crashed run left in the brief is stripped before the probe
#   - exit 0 = measured, 1 = the measure failed, 2 = bad input
#
# .note = the domain-root 🧮 roots every line; no role mascot (rule.prefer.emoji-language)
######################################################################
set -euo pipefail

ORIGINAL_ARGS=("$@")

# the brief that carries the sentinel: a repo=.this brief every actor boots as say
BRIEF=".agent/repo=.this/role=any/briefs/run.executable.lookup.pattern.md.min"
SENTINEL_LEAD="the resume probe sentinel is"

# ONE help text, reached from both call sites (a direct call, and an `rhx` call)
show_help() {
  echo "🧮 boot.resume.probe — does a resumed session boot with the boot of today?"
  echo "   ├─ usage"
  echo "   │  └─ rhx boot.resume.probe [--roles <spec>] [--model <model>]"
  echo "   ├─ options"
  echo "   │  ├─ --roles    the --roles spec passed to rhx enroll; -driver when absent"
  echo "   │  └─ --model    the brain model; haiku when absent"
  echo "   ├─ exits"
  echo "   │  ├─ 0 = measured, and the verdict is ✓ or ✗"
  echo "   │  ├─ 1 = the measure failed — no session, no request bodies"
  echo "   │  └─ 2 = bad input"
  echo "   ├─ examples"
  echo "   │  ├─ rhx boot.resume.probe"
  echo "   │  └─ rhx boot.resume.probe --model sonnet"
  echo "   └─ spends real tokens — two short -p turns"
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
  echo "🧮 boot.resume.probe" >&2
  echo "   ├─ ran = rhx boot.resume.probe${ORIGINAL_ARGS[*]:+ ${ORIGINAL_ARGS[*]}}" >&2
  echo "   ├─ $header" >&2
  if [[ -n "$detail" ]]; then
    echo "   ├─ detail" >&2
    printf '%s\n' "$detail" | tail -n 20 | while IFS= read -r ROW; do
      echo "   │  │ $ROW" >&2
    done
  fi
  echo "   └─ hint = ${hint:-rhx boot.resume.probe help}" >&2
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

if [[ ! -f "$BRIEF" ]]; then
  fail kind=constraint what="the sentinel brief is absent: $BRIEF" hint="run from the repo root"
fi

# one fresh log dir per run; the pid keeps two runs in one second apart
RUN="$(date -u +%Y%m%dT%H%M%SZ).$$"
LOGDIR="$PWD/.log/role=any/skill=boot.resume.probe/$RUN"
mkdir -p "$LOGDIR/first" "$LOGDIR/resumed"
SENTINEL="REEF-$$-SWELL"

# a sentinel a crashed run left behind is stripped first, then the brief is kept as it is
if grep -qF "$SENTINEL_LEAD" "$BRIEF"; then
  grep -vF "$SENTINEL_LEAD" "$BRIEF" > "$LOGDIR/brief.stripped" || true
  cp "$LOGDIR/brief.stripped" "$BRIEF"
fi
cp "$BRIEF" "$LOGDIR/brief.before"

# on every exit: put the brief back as it was
cleanup() {
  [[ -f "$LOGDIR/brief.before" ]] && cp "$LOGDIR/brief.before" "$BRIEF"
}
trap cleanup EXIT

# one -p turn with raw request bodies logged; print the result json, or fail loud
# .note = named args: otel=<dir> log=<file> [resume=<session id>]
turn() {
  local otel="" log="" resume="" arg
  for arg in "$@"; do
    case "$arg" in
      otel=*) otel="${arg#otel=}" ;;
      log=*) log="${arg#log=}" ;;
      resume=*) resume="${arg#resume=}" ;;
    esac
  done
  local args=(enroll claude --roles "$ROLES" -p "Do not use any tools. Reply with exactly: OK" --model "$MODEL" --output-format json)
  [[ -n "$resume" ]] && args+=(--resume "$resume")
  local status=0
  OTEL_LOG_RAW_API_BODIES="file:$otel" npx rhx "${args[@]}" >"$log" 2>&1 || status=$?
  # an enroll refusal (exit 2) is the caller's to fix, any other fault is not
  if [[ "$status" -eq 2 ]]; then
    fail kind=constraint what="a probe enroll refused its args" detail="$(cat "$log")" hint="the full output is at $log"
  fi
  if [[ "$status" -ne 0 ]]; then
    fail kind=malfunction what="a probe turn failed, exit $status" detail="$(cat "$log")" hint="the full output is at $log"
  fi
  # `fromjson?` skips a line that is not json, by name; a fault of jq itself still fails loud
  local result=""
  if ! result=$(jq -c -R 'fromjson? | select(type == "object" and .type == "result")' "$log" 2>&1 | tail -n 1); then
    fail kind=malfunction what="a probe turn output could not be scanned for its result json" detail="$result" hint="the full output is at $log"
  fi
  if [[ -z "$result" ]]; then
    fail kind=malfunction what="a probe turn returned no result json" detail="$(cat "$log")"
  fi
  printf '%s\n' "$result"
}

# does the last raw request in a dir carry the sentinel in its system block?
# .note = named args: otel=<dir>
holds_sentinel() {
  local otel="" arg
  for arg in "$@"; do
    case "$arg" in
      otel=*) otel="${arg#otel=}" ;;
    esac
  done
  if [[ ! -f "$otel/index.jsonl" ]]; then
    fail kind=malfunction what="no raw request bodies under $otel" hint="the brain-cli writes them only when OTEL_LOG_RAW_API_BODIES=file:<dir> reaches it"
  fi
  local file=""
  # a parse fault fails loud and named, never a raw jq abort, never an absent file
  if ! file=$(awk 'NF' "$otel/index.jsonl" | tail -n 1 | jq -r '.request_file // empty' 2>&1); then
    fail kind=malfunction what="the last request row could not be parsed as json" detail="$file"
  fi
  if [[ -z "$file" || ! -f "$otel/$file" ]]; then
    fail kind=malfunction what="the last request row names no body file" detail="$(tail -n 1 "$otel/index.jsonl")"
  fi
  # a parse fault fails loud, never reads as a request without the sentinel
  local holds=""
  if ! holds=$(jq -r --arg s "$SENTINEL" '(.system | tostring) | contains($s) | if . then "yes" else "no" end' "$otel/$file" 2>&1); then
    fail kind=malfunction what="the last request body could not be parsed as json" detail="$holds"
  fi
  echo "$holds"
}

# turn 1: a session opens on the boot as it stands
FIRST=$(turn otel="$LOGDIR/first" log="$LOGDIR/first.log")
SESSION=$(printf '%s' "$FIRST" | jq -r '.session_id // empty')
if [[ -z "$SESSION" ]]; then
  fail kind=malfunction what="turn 1 named no session_id" detail="$FIRST"
fi
FIRST_HOLDS=$(holds_sentinel otel="$LOGDIR/first")

# the edit between the two: one sentinel line in a brief the boot carries
printf '\n%s %s.\n' "$SENTINEL_LEAD" "$SENTINEL" >> "$BRIEF"

# turn 2: resume that session; the spawn renders the boot anew
turn otel="$LOGDIR/resumed" log="$LOGDIR/resumed.log" resume="$SESSION" >/dev/null
RESUMED_HOLDS=$(holds_sentinel otel="$LOGDIR/resumed")

# the premise: the boot the resume spawned with carries the edit; else the measure is void
BOOT_HOLDS="no"
for BOOT in .agent/.actors/*/brain/.claude/boot.md; do
  [[ -f "$BOOT" ]] || continue
  if grep -qF "$SENTINEL" "$BOOT"; then
    BOOT_HOLDS="yes"
  fi
done

# a void measure fails before the tree opens, so stdout never holds a tree with no verdict
if [[ "$FIRST_HOLDS" == "yes" ]]; then
  fail kind=malfunction what="turn 1 already held the sentinel, so the resume measure is void"
fi
if [[ "$BOOT_HOLDS" == "no" ]]; then
  fail kind=malfunction what="the render at the resume spawn did not carry the brief edit, so the resume measure is void" hint="check that $BRIEF renders as say in the actor boot"
fi

echo "🧮 boot.resume.probe --roles '$ROLES' --model $MODEL"
echo "   ├─ the sentinel lands in $BRIEF after turn 1, before the resume"
echo "   ├─ requests"
echo "   │  ├─ turn 1 · system holds the sentinel = $FIRST_HOLDS"
echo "   │  └─ resumed turn · system holds the sentinel = $RESUMED_HOLDS"
echo "   ├─ the boot.md the resume spawned with holds the sentinel = $BOOT_HOLDS"
echo "   │"
echo "   ├─ request bodies = .log/role=any/skill=boot.resume.probe/$RUN"
if [[ "$RESUMED_HOLDS" == "yes" ]]; then
  echo "   └─ ✓ a resume sends the boot of today; an edit reaches a resumed session"
  exit 0
fi
echo "   └─ ✗ a resume sends the boot the session first recorded; an edit waits for a new session"
