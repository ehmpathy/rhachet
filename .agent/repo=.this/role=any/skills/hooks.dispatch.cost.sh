#!/usr/bin/env bash
######################################################################
# .what = measure what one claude tool call costs in hook processes,
#         for two settings files side by side: before and after
#
# .why  = the hook dispatcher claims one process per event in place of
#         one per rule. this reads the claim the same way twice: every
#         hook a settings file fires for one payload, run as claude runs
#         it, timed and traced
#
# usage:
#   rhx hooks.dispatch.cost --before .log/settings.before.json
#   rhx hooks.dispatch.cost --before <file> --after <file> --tool Bash --command pwd --runs 5
#   rhx hooks.dispatch.cost --what verdicts --before <file> --payload @<file>
#
# options:
#   --what      cost (default) | verdicts | execs (which programs one call execs, counted)
#   --before    settings file of the before shape (default: the repo actor's)
#   --after     settings file of the after shape (default: the repo actor's)
#   --event     claude event (default: PreToolUse)
#   --tool      tool name the matcher reads (default: Bash)
#   --command   Bash command in the payload (default: pwd)
#   --payload   a whole payload json, or @<file>; overrides --tool and --command
#   --runs      runs per shape; the median is reported (default: 5)
#
# guarantee:
#   - cpu is read untraced (GNU /usr/bin/time, user + sys, whole tree);
#     process counts are read in a separate traced pass (strace -f), so
#     the trace never inflates the cpu figure
#   - verdicts: the after stdout, stderr and exit code are compared with
#     the merge of the before hooks (every blocker's stderr, in order)
#   - read-only; writes only to a temp dir it removes
#   - exit 0 = measured, 1 = malfunction, 2 = bad input
######################################################################
set -euo pipefail

WHAT="cost"
SETTINGS_DEFAULT=".agent/.actors/actor.via.repo=ambient/brain/.claude/settings.of.repo.json"
BEFORE="$SETTINGS_DEFAULT"
AFTER="$SETTINGS_DEFAULT"
EVENT="PreToolUse"
TOOL="Bash"
COMMAND="pwd"
PAYLOAD=""
RUNS=5

# parse named args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --what) WHAT="$2"; shift 2 ;;
    --before) BEFORE="$2"; shift 2 ;;
    --after) AFTER="$2"; shift 2 ;;
    --event) EVENT="$2"; shift 2 ;;
    --tool) TOOL="$2"; shift 2 ;;
    --command) COMMAND="$2"; shift 2 ;;
    --payload) PAYLOAD="$2"; shift 2 ;;
    --runs) RUNS="$2"; shift 2 ;;
    --help|-h) awk 'NR > 2 && /^#/ { sub(/^# ?/, ""); print } /^set -euo/ { exit }' "$0" | grep -v '^#*$' || :; exit 0 ;;
    --skill|--repo|--role) shift 2 ;;
    *) echo "✋ ConstraintError: unknown arg '$1'; see --help" >&2; exit 2 ;;
  esac
done

# the tools this reads with; absent → name the fix
for bin in jq strace /usr/bin/time; do
  command -v "$bin" > /dev/null || {
    echo "✋ ConstraintError: $bin is required" >&2
    echo "   └─ hint: install $bin; this read is linux-only (strace and GNU time have no darwin build)" >&2
    exit 2
  }
done
for file in "$BEFORE" "$AFTER"; do
  [[ -f "$file" ]] || { echo "✋ ConstraintError: no settings file at $file" >&2; exit 2; }
done

# the payload one tool call hands its hooks
if [[ "$PAYLOAD" == @* ]]; then
  [[ -f "${PAYLOAD#@}" ]] || { echo "✋ ConstraintError: no payload file at ${PAYLOAD#@}" >&2; exit 2; }
  PAYLOAD=$(cat "${PAYLOAD#@}")
fi
if [[ -z "$PAYLOAD" ]]; then
  PAYLOAD=$(jq -cn --arg event "$EVENT" --arg tool "$TOOL" --arg command "$COMMAND" --arg cwd "$PWD" \
    '{hook_event_name:$event,tool_name:$tool,tool_input:{command:$command},cwd:$cwd,session_id:"cost"}')
fi
TOOL=$(printf '%s' "$PAYLOAD" | jq -r '.tool_name // .source // ""')

# the hook commands one settings file fires for this event and tool, per claude's matcher grammar
get_commands() {
  jq -r --arg tool "$TOOL" --arg event "$EVENT" '
    (.hooks[$event] // [])[]
    | select(
        (.matcher // "*") as $m
        | $m == "*" or $m == "" or $tool == ""
          or (($m | test("^[A-Za-z0-9_|,]+$")) and ($m | split("|") | map(split(",")) | flatten | index($tool)))
          or (($m | test("^[A-Za-z0-9_|,]+$") | not) and ($tool | test($m)))
      )
    | .hooks[].command' "$1"
}

DIR=$(mktemp -d)
trap 'rm -rf "$DIR"' EXIT
export __COST_PAYLOAD="$PAYLOAD"

# one call = every fired hook, run as claude runs it (sh -c), output dropped
run_call() {
  local file="$1"
  local commands
  commands=$(get_commands "$file")
  bash -c '
    while IFS= read -r c; do
      [[ -z "$c" ]] && continue
      printf "%s" "$__COST_PAYLOAD" | sh -c "$c" > /dev/null 2>&1 || true
    done <<< "$1"' _ "$commands"
}
export -f get_commands run_call
export TOOL EVENT

# median of a list of numbers
as_median() { sort -n | awk '{ a[NR] = $1 } END { print (NR % 2) ? a[(NR + 1) / 2] : int((a[NR / 2] + a[NR / 2 + 1]) / 2) }'; }

# cpu ms and peak rss of one call, untraced, median of RUNS
measure_cpu() {
  local file="$1" i line
  : > "$DIR/cpu" ; : > "$DIR/rss"
  for ((i = 0; i < RUNS; i++)); do
    line=$( { /usr/bin/time -f '%U %S %M' bash -c 'run_call "$1"' _ "$file" ; } 2>&1 | tail -n 1)
    awk -v l="$line" 'BEGIN { split(l, a, " "); printf "%.0f\n", (a[1] + a[2]) * 1000 }' >> "$DIR/cpu"
    awk -v l="$line" 'BEGIN { split(l, a, " "); printf "%.0f\n", a[3] / 1024 }' >> "$DIR/rss"
  done
  echo "$(as_median < "$DIR/cpu") $(as_median < "$DIR/rss")"
}

# processes of one call, traced once: forks (clone, fork, vfork) and execs
measure_procs() {
  local file="$1"
  strace -f -qq -e trace=clone,clone3,fork,vfork,execve -o "$DIR/trace" bash -c 'run_call "$1"' _ "$file" > /dev/null 2>&1 || true
  local forks execs
  forks=$(grep -cE ' (clone|clone3|fork|vfork)\(' "$DIR/trace" || true)
  execs=$(grep -cE ' execve\(' "$DIR/trace" || true)
  echo "$forks $execs"
}

# the hooks claude starts per call: one per fired command
count_hooks() { get_commands "$1" | grep -c . || true; }

if [[ "$WHAT" == "cost" ]]; then
  read -r cpu_before rss_before <<< "$(measure_cpu "$BEFORE")"
  read -r cpu_after rss_after <<< "$(measure_cpu "$AFTER")"
  read -r forks_before execs_before <<< "$(measure_procs "$BEFORE")"
  read -r forks_after execs_after <<< "$(measure_procs "$AFTER")"
  echo "heres the read..."
  echo ""
  echo "🧮 hooks.dispatch.cost --event $EVENT --tool $TOOL --runs $RUNS"
  # a bare run reads one file twice; say so, so equal numbers never read as "no change"
  [[ "$BEFORE" == "$AFTER" ]] && echo "   ├─ note = before and after name one file; pass --before <settings> for a delta"
  echo "   ├─ before = $BEFORE"
  echo "   │  ├─ hooks claude starts = $(count_hooks "$BEFORE")"
  echo "   │  ├─ processes forked = $forks_before ($execs_before execs)"
  echo "   │  ├─ cpu per call = $cpu_before ms"
  echo "   │  └─ peak rss of one process = $rss_before MB"
  echo "   └─ after = $AFTER"
  echo "      ├─ hooks claude starts = $(count_hooks "$AFTER")"
  echo "      ├─ processes forked = $forks_after ($execs_after execs)"
  echo "      ├─ cpu per call = $cpu_after ms"
  echo "      └─ peak rss of one process = $rss_after MB"
  exit 0
fi

if [[ "$WHAT" == "verdicts" ]]; then
  # before: each hook alone; the merge claude shows is every blocker's stderr, in order
  : > "$DIR/err.before"
  code_before=0
  index=0
  while IFS= read -r c; do
    [[ -z "$c" ]] && continue
    index=$((index + 1))
    code=0
    printf '%s' "$PAYLOAD" | sh -c "$c" > /dev/null 2> "$DIR/err.$index" || code=$?
    if [[ "$code" == 2 ]]; then
      code_before=2
      cat "$DIR/err.$index" >> "$DIR/err.before"
    fi
    [[ "$code" != 0 && "$code" != 2 && "$code_before" == 0 ]] && code_before="$code"
  done <<< "$(get_commands "$BEFORE")"

  # after: the dispatcher hook(s) as claude runs them
  : > "$DIR/err.after"
  code_after=0
  while IFS= read -r c; do
    [[ -z "$c" ]] && continue
    code=0
    printf '%s' "$PAYLOAD" | sh -c "$c" > /dev/null 2>> "$DIR/err.after" || code=$?
    [[ "$code" != 0 ]] && code_after="$code"
  done <<< "$(get_commands "$AFTER")"

  same_err="no"
  [[ "$code_before" != 2 ]] && same_err="n/a (no block)"
  [[ "$code_before" == 2 ]] && cmp -s "$DIR/err.before" "$DIR/err.after" && same_err="yes"
  echo "heres the read..."
  echo ""
  echo "🧮 hooks.dispatch.cost --what verdicts --event $EVENT --tool $TOOL"
  echo "   ├─ before exit = $code_before ($(count_hooks "$BEFORE") hooks)"
  echo "   ├─ after exit = $code_after ($(count_hooks "$AFTER") hooks)"
  echo "   └─ blocker stderr byte-equal = $same_err"
  [[ "$code_before" == 2 && "$code_after" != 2 ]] && exit 1
  [[ "$code_before" == 2 && "$same_err" != yes ]] && exit 1
  [[ "$code_before" != 2 && "$code_after" == 2 ]] && exit 1
  exit 0
fi

if [[ "$WHAT" == "execs" ]]; then
  # which programs one call execs, per shape, counted
  for shape in before after; do
    file="$BEFORE"; [[ "$shape" == after ]] && file="$AFTER"
    strace -f -qq -e trace=execve -o "$DIR/trace.$shape" bash -c 'run_call "$1"' _ "$file" > /dev/null 2>&1 || true
    echo "🧮 hooks.dispatch.cost --what execs ($shape)"
    grep -oE 'execve\("[^"]+"' "$DIR/trace.$shape" | sed -E 's/execve\("//; s/"$//' | sort | uniq -c | sort -rn | sed 's/^/   ├─ /'
    echo ""
  done
  exit 0
fi

echo "✋ ConstraintError: --what must be cost, verdicts, or execs" >&2
exit 2
