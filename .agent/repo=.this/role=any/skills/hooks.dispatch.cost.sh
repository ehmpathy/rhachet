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
#   --before    settings file of the before shape (default: when the after settings start the
#               dispatcher, its own manifest rules as one hook each, so both shapes run the same
#               rules; else the repo actor's)
#   --after     settings file of the after shape (default: the repo actor's)
#   --event     claude event (default: PreToolUse)
#   --tool      tool name the matcher reads (default: Bash)
#   --command   Bash command in the payload (default: pwd)
#   --payload   a whole payload json, or @<file>; overrides --tool and --command
#   --payload-bytes
#               a Write payload whose content holds this many bytes, to read the cost of a large
#               payload; overrides --tool, --command and --payload
#   --runs     runs per shape; the median is reported (default: 5)
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
PAYLOAD_BYTES=""
RUNS=5
BEFORE_SET=0

# parse named args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --what) WHAT="$2"; shift 2 ;;
    --before) BEFORE="$2"; BEFORE_SET=1; shift 2 ;;
    --after) AFTER="$2"; shift 2 ;;
    --event) EVENT="$2"; shift 2 ;;
    --tool) TOOL="$2"; shift 2 ;;
    --command) COMMAND="$2"; shift 2 ;;
    --payload) PAYLOAD="$2"; shift 2 ;;
    --payload-bytes) PAYLOAD_BYTES="$2"; shift 2 ;;
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
[[ -f "$AFTER" ]] || { echo "✋ ConstraintError: no settings file at $AFTER" >&2; exit 2; }
[[ "$BEFORE_SET" == 0 || -f "$BEFORE" ]] || { echo "✋ ConstraintError: no settings file at $BEFORE" >&2; exit 2; }

DIR=$(mktemp -d)
trap 'rm -rf "$DIR"' EXIT

# with no --before, the before shape is the after shape's own rules, one hook each: every manifest
#   row the after dispatchers name, as a per-rule hook with its declared command, matcher and
#   timeout, in manifest order. so the two shapes run the same rules, and only the shape differs
BEFORE_LABEL="$BEFORE"
if [[ "$BEFORE_SET" == 0 ]]; then
  manifests=$(jq -r '[.hooks // {} | .[][] | .hooks[]?.command | select(test("/hooks\\.dispatch\\.sh ")) | split(" ")[2]] | unique | .[]' "$AFTER")
  if [[ -n "$manifests" ]]; then
    BEFORE="$DIR/settings.before.per-rule.json"
    while IFS= read -r m; do
      [[ -f "$m" ]] || { echo "✋ ConstraintError: the after settings name a manifest that is absent: $m" >&2; echo "   └─ hint: run \`npx rhx init --hooks\`, or pass --before <settings>" >&2; exit 2; }
      cat "$m"
    done <<< "$manifests" | jq -R -s '
      split("\n")
      | map(select(length > 0 and (startswith("#") | not)) | split("\u001f"))
      | map({ event: .[0], matcher: .[1], timeout: (.[2] | tonumber), command: .[8] })
      | group_by(.event)
      | map({ key: .[0].event, value: map({ matcher, hooks: [{ type: "command", command, timeout }] }) })
      | from_entries
      | { hooks: . }' > "$BEFORE"
    BEFORE_LABEL="the after manifest, one hook per rule ($(printf '%s' "$manifests" | tr '\n' ' ' | sed 's/ $//'))"
  fi
fi
[[ -f "$BEFORE" ]] || { echo "✋ ConstraintError: no settings file at $BEFORE" >&2; echo "   └─ hint: pass --before <settings>, or --after settings that start the hook dispatcher" >&2; exit 2; }

# the payload one tool call hands its hooks
if [[ "$PAYLOAD" == @* ]]; then
  [[ -f "${PAYLOAD#@}" ]] || { echo "✋ ConstraintError: no payload file at ${PAYLOAD#@}" >&2; exit 2; }
  PAYLOAD=$(cat "${PAYLOAD#@}")
fi
if [[ -n "$PAYLOAD_BYTES" ]]; then
  [[ "$PAYLOAD_BYTES" =~ ^[0-9]+$ ]] || { echo "✋ ConstraintError: --payload-bytes takes a byte count, got '$PAYLOAD_BYTES'" >&2; echo "   └─ hint: rhx hooks.dispatch.cost --payload-bytes 1000000" >&2; exit 2; }
  PAYLOAD=$(head -c "$PAYLOAD_BYTES" /dev/zero | tr '\0' a | jq -Rsc --arg cwd "$PWD" \
    '{hook_event_name:"PreToolUse",tool_name:"Write",tool_input:{file_path:"payload.txt",content:.},cwd:$cwd,session_id:"cost"}')
fi
if [[ -z "$PAYLOAD" ]]; then
  PAYLOAD=$(jq -cn --arg event "$EVENT" --arg tool "$TOOL" --arg command "$COMMAND" --arg cwd "$PWD" \
    '{hook_event_name:$event,tool_name:$tool,tool_input:{command:$command},cwd:$cwd,session_id:"cost"}')
fi
TOOL=$(printf '%s' "$PAYLOAD" | jq -r '.tool_name // .source // ""')

# the header names --tool only when the payload holds a tool (a SessionStart matcher reads the source)
TOOL_FLAG=""
[[ -n "$(printf '%s' "$PAYLOAD" | jq -r '.tool_name // ""')" ]] && TOOL_FLAG=" --tool $TOOL"

# the hooks one settings file fires for this event and tool, per claude's matcher grammar,
#   one line each: `<timeout seconds>\x1f<command>` (claude's default 60s where none is declared)
get_hooks() {
  jq -r --arg tool "$TOOL" --arg event "$EVENT" '
    (.hooks[$event] // [])[]
    | select(
        (.matcher // "*") as $m
        | $m == "*" or $m == "" or $tool == ""
          or (($m | test("^[A-Za-z0-9_|,]+$")) and ($m | split("|") | map(split(",")) | flatten | index($tool)))
          or (($m | test("^[A-Za-z0-9_|,]+$") | not) and ($tool | test($m)))
      )
    | .hooks[] | "\(.timeout // 60)\u001f\(.command)"' "$1"
}

# the hook commands alone
get_commands() { get_hooks "$1" | cut -d $'\x1f' -f 2-; }

# the payload rides a file, never an env var: linux caps one env string at 128 KB, and a Write
#   payload can exceed it
printf '%s' "$PAYLOAD" > "$DIR/payload.json"
export __COST_PAYLOAD_FILE="$DIR/payload.json"

# one call = every fired hook, run as claude runs it (sh -c), output dropped
run_call() {
  local file="$1"
  local commands
  commands=$(get_commands "$file")
  bash -c '
    while IFS= read -r c; do
      [[ -z "$c" ]] && continue
      sh -c "$c" < "$__COST_PAYLOAD_FILE" > /dev/null 2>&1 || true
    done <<< "$1"' _ "$commands"
}
export -f get_hooks get_commands run_call
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
  echo "🧮 hooks.dispatch.cost --event $EVENT$TOOL_FLAG --runs $RUNS"
  # a bare run reads one file twice; say so, so equal numbers never read as "no change"
  [[ "$BEFORE" == "$AFTER" ]] && echo "   ├─ note = before and after name one file; pass --before <settings> for a delta"
  echo "   ├─ before = $BEFORE_LABEL"
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
  # before: each hook alone, killed at its declared timeout as claude kills it, so a slow rule
  #   times out in both shapes alike; the merge claude shows is every blocker's stderr, in order
  #   and its stdout is every hook's stdout, in settings order
  : > "$DIR/err.before"
  : > "$DIR/out.before"
  code_before=0
  index=0
  while IFS=$'\x1f' read -r t c; do
    [[ -z "$c" ]] && continue
    index=$((index + 1))
    code=0
    printf '%s' "$PAYLOAD" | timeout -k 2 "$t" sh -c "$c" >> "$DIR/out.before" 2> "$DIR/err.$index" || code=$?
    if [[ "$code" == 2 ]]; then
      code_before=2
      cat "$DIR/err.$index" >> "$DIR/err.before"
    fi
    [[ "$code" != 0 && "$code" != 2 && "$code_before" == 0 ]] && code_before="$code"
  done <<< "$(get_hooks "$BEFORE")"

  # after: the dispatcher hook(s) as claude runs them
  : > "$DIR/err.after"
  : > "$DIR/out.after"
  code_after=0
  while IFS= read -r c; do
    [[ -z "$c" ]] && continue
    code=0
    printf '%s' "$PAYLOAD" | sh -c "$c" >> "$DIR/out.after" 2>> "$DIR/err.after" || code=$?
    [[ "$code" != 0 ]] && code_after="$code"
  done <<< "$(get_commands "$AFTER")"

  # the dispatcher ends a block with one `🪝 hooks.dispatch … blocked by <rule>` line per blocker,
  #   since claude's label names only the dispatcher; the blockers' own bytes precede it
  grep -v '^🪝 hooks.dispatch .* blocked by ' "$DIR/err.after" > "$DIR/err.after.rules" || :
  tails=$(grep -c '^🪝 hooks.dispatch .* blocked by ' "$DIR/err.after" || :)
  same_err="no"
  [[ "$code_before" != 2 ]] && same_err="n/a (no block)"
  [[ "$code_before" == 2 ]] && cmp -s "$DIR/err.before" "$DIR/err.after.rules" && same_err="yes"
  # stdout is what claude reads on a call that is not blocked (context, a json decision); on a block it reads stderr
  same_out="no"
  [[ "$code_before" == 2 ]] && same_out="n/a (block)"
  [[ "$code_before" != 2 ]] && cmp -s "$DIR/out.before" "$DIR/out.after" && same_out="yes"
  echo "heres the read..."
  echo ""
  echo "🧮 hooks.dispatch.cost --what verdicts --event $EVENT$TOOL_FLAG"
  # the hook count, with its noun in the right number
  n_before=$(count_hooks "$BEFORE")
  n_after=$(count_hooks "$AFTER")
  echo "   ├─ before exit = $code_before ($n_before hook$([[ "$n_before" == 1 ]] || echo s))"
  echo "   ├─ after exit = $code_after ($n_after hook$([[ "$n_after" == 1 ]] || echo s))"
  echo "   ├─ blocker stderr byte-equal = $same_err"
  echo "   ├─ stdout byte-equal = $same_out"
  echo "   └─ blocked-by lines after = ${tails:-0}"
  # a stdout that differs shows how, so the reader sees the cause, not a bare `no`
  if [[ "$code_before" != 2 && "$same_out" != yes ]]; then
    echo "💥 MalfunctionError: the dispatcher stdout differs from the per-rule stdout" >&2
    echo "   └─ diff, before as < and after as >, first 40 lines" >&2
    diff "$DIR/out.before" "$DIR/out.after" | head -n 40 | sed 's/^/      /' >&2 || :
    exit 1
  fi
  [[ "$code_before" == 2 && "$code_after" != 2 ]] && exit 1
  # a blocker stderr that differs shows how, as stdout does above
  if [[ "$code_before" == 2 && "$same_err" != yes ]]; then
    echo "💥 MalfunctionError: the dispatcher blocker stderr differs from the per-rule stderr" >&2
    echo "   └─ diff, before as < and after as > with blocked-by tails dropped, first 40 lines" >&2
    diff "$DIR/err.before" "$DIR/err.after.rules" | head -n 40 | sed 's/^/      /' >&2 || :
    exit 1
  fi
  [[ "$code_before" != 2 && "$code_after" == 2 ]] && exit 1
  exit 0
fi

if [[ "$WHAT" == "execs" ]]; then
  # which programs one call execs, per shape, counted
  for shape in before after; do
    file="$BEFORE"; [[ "$shape" == after ]] && file="$AFTER"
    strace -f -qq -e trace=execve -o "$DIR/trace.$shape" bash -c 'run_call "$1"' _ "$file" > /dev/null 2>&1 || true
    echo "🧮 hooks.dispatch.cost --what execs ($shape)"
    mapfile -t rows < <(grep -oE 'execve\("[^"]+"' "$DIR/trace.$shape" | sed -E 's/execve\("//; s/"$//' | sort | uniq -c | sort -rn | awk '{ printf "%s = %s execs\n", $2, $1 }')
    (( ${#rows[@]} == 0 )) && rows=("no execs traced")
    for i in "${!rows[@]}"; do
      elbow='├─'; (( i == ${#rows[@]} - 1 )) && elbow='└─'
      echo "   $elbow ${rows[$i]}"
    done
    echo ""
  done
  exit 0
fi

echo "✋ ConstraintError: --what must be cost, verdicts, or execs, got '$WHAT'" >&2
echo "   └─ hint: rhx hooks.dispatch.cost --what cost" >&2
exit 2
