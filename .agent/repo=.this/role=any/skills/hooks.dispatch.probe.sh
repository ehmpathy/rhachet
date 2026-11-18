#!/usr/bin/env bash
######################################################################
# .what = probe the facts a one-process hook dispatcher rests on
#
# .why  = the dispatcher runs each role rule in a subshell of one bash
#         process. two facts decide whether that holds a rule's bytes
#         and verdict as a standalone process would:
#         - which hooks a tool call fires today, per actor settings
#         - whether a rule's own-process idioms ($0, BASH_SOURCE, exit,
#           trap EXIT, set -e) act per rule inside a sourced subshell
#
# usage:
#   rhx hooks.dispatch.probe --what hooks --tool Bash
#   rhx hooks.dispatch.probe --what hooks --tool Write --event PreToolUse \
#     --settings .agent/.actors/actor.via.repo=ambient/brain/.claude/settings.of.repo.json
#   rhx hooks.dispatch.probe --what idioms
#   rhx hooks.dispatch.probe --what cost --tool Bash --runs 20
#   rhx hooks.dispatch.probe --what verdicts --payload '{"tool_name":"Bash","tool_input":{"command":"pwd"}}'
#
# guarantee:
#   - read-only; writes only to a temp dir it removes
#   - exit 0 = probed, 1 = malfunction, 2 = bad input
######################################################################
set -euo pipefail

WHAT=""
TOOL=""
EVENT="PreToolUse"
SETTINGS=".agent/.actors/actor.via.repo=ambient/brain/.claude/settings.of.repo.json"

# parse named args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --what) WHAT="$2"; shift 2 ;;
    --tool) TOOL="$2"; shift 2 ;;
    --event) EVENT="$2"; shift 2 ;;
    --settings) SETTINGS="$2"; shift 2 ;;
    --runs) RUNS="$2"; shift 2 ;;
    --payload) PAYLOAD="$2"; shift 2 ;;
    --help|-h) awk 'NR > 2 && /^#/ { sub(/^# ?/, ""); print } /^set -euo/ { exit }' "${BASH_SOURCE[0]}" | grep -v '^#*$' || :; exit 0 ;;
    --skill|--repo|--role) shift 2 ;;
    *) echo "✋ ConstraintError: unknown arg '$1'; see --help" >&2; exit 2 ;;
  esac
done

# the tools this reads with; absent → name the fix
for bin in jq /usr/bin/time; do
  command -v "$bin" > /dev/null || {
    echo "✋ ConstraintError: $bin is required" >&2
    echo "   └─ hint: install $bin; the cost read is linux-only (GNU time has no darwin build)" >&2
    exit 2
  }
done

# list the hook commands one tool call fires, per claude's matcher grammar
probe_hooks() {
  if [[ -z "$TOOL" ]]; then
    echo "✋ ConstraintError: --what hooks needs --tool <name>" >&2
    exit 2
  fi
  if [[ ! -f "$SETTINGS" ]]; then
    echo "✋ ConstraintError: no settings at $SETTINGS" >&2
    exit 2
  fi
  local commands
  commands=$(jq -r --arg tool "$TOOL" --arg event "$EVENT" '
    (.hooks[$event] // [])[]
    | select(
        (.matcher // "*") as $m
        | $m == "*" or $m == ""
          or (($m | test("^[A-Za-z0-9_|,]+$")) and ($m | split("|") | map(split(",")) | flatten | map(gsub("^ +| +$"; "")) | index($tool)))
          or (($m | test("^[A-Za-z0-9_|,]+$") | not) and ($tool | test($m)))
      )
    | .hooks[].command' "$SETTINGS")
  local count
  count=$(printf '%s\n' "$commands" | grep -c . || true)
  echo "heres the read..."
  echo ""
  echo "🧮 hooks.dispatch.probe --what hooks --tool $TOOL --event $EVENT"
  echo "   ├─ settings = $SETTINGS"
  echo "   ├─ $count hooks fire"
  echo "   └─ commands"
  local i=0
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    i=$((i + 1))
    if [[ $i -eq $count ]]; then echo "      └─ $line"; else echo "      ├─ $line"; fi
  done <<<"$commands"
}

# check each own-process idiom inside a sourced subshell
probe_idioms() {
  local dir
  dir=$(mktemp -d)
  trap 'rm -rf "$dir"' RETURN

  # a rule that reads $0, BASH_SOURCE, stdin, sets -e, traps EXIT, and exits 2
  cat >"$dir/pretooluse.probe-rule.sh" <<'RULE'
set -euo pipefail
trap 'echo "trap fired in ${0##*/}" >&2' EXIT
STDIN_INPUT=$(cat)
echo "name=${0##*/}"
echo "source=${BASH_SOURCE[0]##*/}"
echo "stdin=$STDIN_INPUT"
false_status=0
false || false_status=$?
echo "set-e-guarded=$false_status"
exit 2
RULE

  # run it as a standalone process (today) and as a sourced subshell (dispatcher)
  local out_alone err_alone code_alone out_sub err_sub code_sub
  code_alone=0
  out_alone=$(printf '%s' '{"tool_name":"Bash"}' | bash "$dir/pretooluse.probe-rule.sh" 2>"$dir/err.alone") || code_alone=$?
  err_alone=$(cat "$dir/err.alone")
  code_sub=0
  out_sub=$(printf '%s' '{"tool_name":"Bash"}' | ( BASH_ARGV0="$dir/pretooluse.probe-rule.sh"; source "$dir/pretooluse.probe-rule.sh" ) 2>"$dir/err.sub") || code_sub=$?
  err_sub=$(cat "$dir/err.sub")

  # a rule that exits must not end the caller
  local survived="no"
  ( exit 2 ) || true
  survived="yes"

  # report
  local verdict_out verdict_err verdict_code
  [[ "$out_alone" == "$out_sub" ]] && verdict_out="same" || verdict_out="differs"
  [[ "$err_alone" == "$err_sub" ]] && verdict_err="same" || verdict_err="differs"
  [[ "$code_alone" == "$code_sub" ]] && verdict_code="same" || verdict_code="differs"
  echo "heres the read..."
  echo ""
  echo "🧮 hooks.dispatch.probe --what idioms"
  echo "   ├─ bash = ${BASH_VERSION}"
  echo "   ├─ stdout = $verdict_out"
  echo "   │  ├─ alone"
  while IFS= read -r line; do echo "   │  │  ├─ $line"; done <<<"$out_alone"
  echo "   │  └─ subshell"
  while IFS= read -r line; do echo "   │     ├─ $line"; done <<<"$out_sub"
  echo "   ├─ stderr = $verdict_err"
  echo "   │  ├─ alone = $err_alone"
  echo "   │  └─ subshell = $err_sub"
  echo "   ├─ exit code = $verdict_code (alone $code_alone, subshell $code_sub)"
  echo "   └─ caller survives a rule exit = $survived"
}

# compare cpu per rule: an exec of bash per rule (today) vs a sourced subshell (dispatcher)
probe_cost() {
  local runs="${RUNS:-20}"
  local rules=()
  local declared=()
  local resolved=()
  local line skill args path
  while IFS= read -r line; do
    declared+=("$line")
    if [[ "$line" == bash\ * ]]; then
      rules+=("${line#bash }")
      resolved+=("${line#bash }")
      continue
    fi
    # an rhx skill rule resolves to its .sh under .agent/, with its args kept
    if [[ "$line" == ./node_modules/.bin/rhx\ * ]]; then
      skill=$(printf '%s' "${line#./node_modules/.bin/rhx }" | cut -d' ' -f1)
      args="${line#./node_modules/.bin/rhx "$skill"}"
      path=$(compgen -G ".agent/repo=*/role=*/skills/${skill}.sh" | head -n 1 || true)
      [[ -n "$path" ]] && resolved+=("$path$args")
    fi
  done < <(jq -r --arg tool "${TOOL:-Bash}" '
    (.hooks.PreToolUse // [])[]
    | select((.matcher // "*") as $m | $m == "*" or ($m | split("|") | index($tool)))
    | .hooks[].command' "$SETTINGS")
  if [[ ${#rules[@]} -eq 0 ]]; then
    echo "✋ ConstraintError: no bash rules fit --tool ${TOOL:-Bash} in $SETTINGS" >&2
    exit 2
  fi
  local payload
  payload=$(jq -cn --arg cwd "$PWD" '{hook_event_name:"PreToolUse",tool_name:"Bash",tool_input:{command:"pwd"},cwd:$cwd}')
  export __PROBE_PAYLOAD="$payload" __PROBE_RUNS="$runs"

  # today: one bash exec per rule
  local alone
  alone=$( { /usr/bin/time -f '%U %S %M' bash -c '
    for r in "$@"; do for ((i=0;i<__PROBE_RUNS;i++)); do
      printf "%s" "$__PROBE_PAYLOAD" | bash "$r" >/dev/null 2>&1 || true
    done; done' _ "${rules[@]}" ; } 2>&1 | tail -n 1)

  # dispatcher: one sourced subshell per rule
  local sub
  sub=$( { /usr/bin/time -f '%U %S %M' bash -c '
    for r in "$@"; do for ((i=0;i<__PROBE_RUNS;i++)); do
      printf "%s" "$__PROBE_PAYLOAD" | ( BASH_ARGV0="$r"; source "$r" ) >/dev/null 2>&1 || true
    done; done' _ "${rules[@]}" ; } 2>&1 | tail -n 1)

  # whole event: every declared command as claude runs it today, vs every resolved rule as a subshell
  local event_today event_after
  event_today=$( { /usr/bin/time -f '%U %S %M' bash -c '
    for ((i=0;i<__PROBE_RUNS;i++)); do for c in "$@"; do
      printf "%s" "$__PROBE_PAYLOAD" | sh -c "$c" >/dev/null 2>&1 || true
    done; done' _ "${declared[@]}" ; } 2>&1 | tail -n 1)
  event_after=$( { /usr/bin/time -f '%U %S %M' bash -c '
    for ((i=0;i<__PROBE_RUNS;i++)); do for c in "$@"; do
      r="${c%% *}"; a=(); [[ "$c" == *" "* ]] && read -r -a a <<<"${c#* }"
      printf "%s" "$__PROBE_PAYLOAD" | ( BASH_ARGV0="$r"; set -- "${a[@]}"; source "$r" ) >/dev/null 2>&1 || true
    done; done' _ "${resolved[@]}" ; } 2>&1 | tail -n 1)

  # per call = total cpu / runs
  as_ms() { awk -v u="${1%% *}" -v rest="${1#* }" -v n="$runs" 'BEGIN { split(rest, a, " "); printf "%.0f", (u + a[1]) * 1000 / n }'; }
  echo "heres the read..."
  echo ""
  echo "🧮 hooks.dispatch.probe --what cost --tool ${TOOL:-Bash}"
  echo "   ├─ $runs runs, payload = pwd"
  echo "   ├─ bash rules (${#rules[@]})"
  echo "   │  ├─ exec per rule (today) = $(as_ms "$alone") ms cpu per call"
  echo "   │  └─ subshell per rule (dispatcher) = $(as_ms "$sub") ms cpu per call"
  echo "   └─ whole event (${#declared[@]} declared, ${#resolved[@]} resolved)"
  echo "      ├─ as declared (today) = $(as_ms "$event_today") ms cpu per call"
  echo "      └─ resolved, as subshells (dispatcher) = $(as_ms "$event_after") ms cpu per call"
}

# compare each declared hook's exit code and stderr vs its resolved .sh run as a subshell
probe_verdicts() {
  local payload="${PAYLOAD:-}"
  if [[ -z "$payload" ]]; then
    echo "✋ ConstraintError: --what verdicts needs --payload '<json>' or --payload @<file>" >&2
    exit 2
  fi
  # @<file> reads the payload from a file, so a sharp payload never sits in the caller's command
  if [[ "$payload" == @* ]]; then
    if [[ ! -f "${payload#@}" ]]; then
      echo "✋ ConstraintError: no payload file at ${payload#@}" >&2
      exit 2
    fi
    payload=$(cat "${payload#@}")
  fi
  local tool
  tool=$(printf '%s' "$payload" | jq -r '.tool_name')
  local dir
  dir=$(mktemp -d)
  trap 'rm -rf "$dir"' RETURN
  echo "heres the read..."
  echo ""
  echo "🧮 hooks.dispatch.probe --what verdicts --tool $tool"
  local line skill args r code_decl code_res same_err
  local total=0 agree=0
  while IFS= read -r line; do
    r=""
    args=""
    [[ "$line" == bash\ * ]] && r="${line#bash }"
    if [[ "$line" == ./node_modules/.bin/rhx\ * ]]; then
      skill=$(printf '%s' "${line#./node_modules/.bin/rhx }" | cut -d' ' -f1)
      args="${line#./node_modules/.bin/rhx "$skill"}"
      r=$(compgen -G ".agent/repo=*/role=*/skills/${skill}.sh" | head -n 1 || true)
    fi
    [[ -z "$r" ]] && continue
    total=$((total + 1))
    code_decl=0
    printf '%s' "$payload" | sh -c "$line" >/dev/null 2>"$dir/err.decl" || code_decl=$?
    code_res=0
    # shellcheck disable=SC2086
    printf '%s' "$payload" | ( BASH_ARGV0="$r"; set -- $args; source "$r" ) >/dev/null 2>"$dir/err.res" || code_res=$?
    # an rhx rule's declared stderr wraps the skill's trimmed stderr in its frame; compare the skill's part
    if grep -qF -- "$(head -c 200 "$dir/err.res" | sed -e '/^$/d' | head -n 1)" "$dir/err.decl" 2>/dev/null || [[ ! -s "$dir/err.res" ]]; then same_err="yes"; else same_err="no"; fi
    [[ "$code_decl" == "$code_res" && "$same_err" == "yes" ]] && agree=$((agree + 1))
    echo "   ├─ ${r##*/} → declared $code_decl, resolved $code_res, stderr body held = $same_err"
  done < <(jq -r --arg tool "$tool" '
    (.hooks.PreToolUse // [])[]
    | select((.matcher // "*") as $m | $m == "*" or ($m | split("|") | index($tool)))
    | .hooks[].command' "$SETTINGS")
  echo "   └─ $agree of $total agree"
}

case "$WHAT" in
  hooks) probe_hooks ;;
  idioms) probe_idioms ;;
  cost) probe_cost ;;
  verdicts) probe_verdicts ;;
  *) echo "✋ ConstraintError: --what must be hooks, idioms, cost, or verdicts" >&2; exit 2 ;;
esac
