#!/usr/bin/env bash
######################################################################
# 🧮 boot.cache.probe — does a new session of an actor read its boot from cache?
#
# .what = two one-shot `-p` clones of the same actor, back-to-back, with
#         different prompts, and the usage the api returned for each
#
# .why  = the boot is a cache win only if a fresh session reads it, not
#         writes it. one call yields the figure, in claude's own tokens,
#         never a proxy tokenizer:
#           - first run   = the whole first-call prefix, and how much was written
#           - second run  = how much of that prefix the next session read
#         a second session with a new prompt should write only its own
#         first message; all else (tools, system prompt, the boot) is a read
#
# usage:
#   run `rhx boot.cache.probe help` — `show_help()` below is the one source,
#   pinned by `boot.cache.probe.integration.test.ts`
#
# guarantee:
#   - spends real tokens: two short calls (~2 boots, the second mostly reads)
#   - each clone is a leaf `-p` run with one prompt; none persists
#   - the verdict reads usage only, never where the boot sits
#   - a probe that returns no usage fails loud; it never renders as a ✗ verdict
#   - exit 0 = measured (✓ or ✗), 1 = the measure failed, 2 = bad input
#
# .note = the domain-root 🧮 roots every line; no role mascot (rule.prefer.emoji-language)
######################################################################
set -euo pipefail

ORIGINAL_ARGS=("$@")

# ONE help text, reached from both call sites: a direct call where `help` leads, and an
#   `rhx` call, which passes `--skill/--repo/--role` ahead of the caller's own args
show_help() {
  echo "🧮 boot.cache.probe — does a new session of an actor read its boot from cache?"
  echo "   ├─ usage"
  echo "   │  └─ rhx boot.cache.probe [--roles <spec>] [--model <model>] [--diff] [--across <where>]"
  echo "   ├─ options"
  echo "   │  ├─ --roles    the --roles spec passed to rhx enroll; -driver when absent, so a probe never drives a bound route"
  echo "   │  ├─ --model    the brain model; haiku when absent"
  echo "   │  ├─ --diff     log both raw request bodies, list their blocks, name the first byte that differs"
  echo "   │  └─ --across   where the second session runs; one of tree or worktree"
  echo "   │     ├─ tree      this worktree, the default"
  echo "   │     └─ worktree  a temp git worktree of HEAD, so the second session runs at another path"
  echo "   ├─ exits"
  echo "   │  ├─ 0 = measured, and the verdict is ✓ or ✗"
  echo "   │  ├─ 1 = the measure failed — a probe returned no usage, or --diff found no request bodies"
  echo "   │  └─ 2 = bad input, or an enroll refused its args"
  echo "   ├─ examples"
  echo "   │  ├─ rhx boot.cache.probe"
  echo "   │  ├─ rhx boot.cache.probe --model sonnet"
  echo "   │  ├─ rhx boot.cache.probe --diff"
  echo "   │  ├─ rhx boot.cache.probe --across worktree"
  echo "   │  └─ rhx boot.cache.probe --roles '-driver +architect'"
  echo "   └─ spends real tokens — two short -p calls"
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
  echo "🧮 boot.cache.probe" >&2
  echo "   ├─ ran = rhx boot.cache.probe${ORIGINAL_ARGS[*]:+ ${ORIGINAL_ARGS[*]}}" >&2
  echo "   ├─ $header" >&2
  if [[ -n "$detail" ]]; then
    echo "   ├─ detail" >&2
    printf '%s\n' "$detail" | tail -n 20 | while IFS= read -r ROW; do
      echo "   │  │ $ROW" >&2
    done
  fi
  echo "   └─ hint = ${hint:-rhx boot.cache.probe help}" >&2
  # literal exits, so a reader (and the unknown-flag clamp) sees this never returns
  [[ "$code" -eq 2 ]] && exit 2
  exit 1
}

# belay when a flag's value is absent or is itself a flag
# named args: flag=<name> value=<candidate> [valid=<set>]
require_val() {
  local flag="" value="" valid="" arg
  for arg in "$@"; do
    case "$arg" in
      flag=*) flag="${arg#flag=}" ;;
      value=*) value="${arg#value=}" ;;
      valid=*) valid="${arg#valid=}" ;;
    esac
  done
  if [[ -z "$value" || "$value" == --* ]]; then
    fail kind=constraint what="absent value for $flag" hint="${valid:+pass one of $valid — }rhx boot.cache.probe help"
  fi
}

# help, ahead of the loop — for a direct call where `help` is the first token
if [[ "${1:-}" == "help" || "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  show_help
fi

# a probe is a one-shot -p peer in the caller's worktree; with the driver role it would take the
#   bound route's stone and drive it (rule.forbid.peer-clones-that-carry-the-driver-role)
ROLES="-driver"
MODEL="haiku"
DIFF=false
ACROSS="tree"

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
    --diff)
      DIFF=true
      shift
      ;;
    --across)
      require_val flag=--across value="${2:-}" valid="tree or worktree"
      ACROSS="$2"
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

# --across is a closed set
if [[ "$ACROSS" != "tree" && "$ACROSS" != "worktree" ]]; then
  fail kind=constraint what="invalid --across value $ACROSS" hint="pass one of tree or worktree"
fi

# one fresh log dir per run; the pid keeps two runs in one second apart
LOGDIR=".log/role=any/skill=boot.cache.probe/$(date -u +%Y%m%dT%H%M%SZ).$$"
mkdir -p "$LOGDIR/first" "$LOGDIR/second"

# one leaf -p probe; print its "input write read" figures, or fail loud
# .note = named args: prompt=<text> dir=<cwd> log=<file> [otel=<dir>]; two real sessions open with different prompts
probe() {
  local prompt="" dir="." otel="" log="" arg
  for arg in "$@"; do
    case "$arg" in
      prompt=*) prompt="${arg#prompt=}" ;;
      dir=*) dir="${arg#dir=}" ;;
      otel=*) otel="${arg#otel=}" ;;
      log=*) log="${arg#log=}" ;;
    esac
  done
  local args=(enroll claude --roles "$ROLES")
  args+=(-p "$prompt" --model "$MODEL" --output-format json)
  local envs=()
  [[ -n "$otel" ]] && envs+=("OTEL_LOG_RAW_API_BODIES=file:$otel")

  # run the clone; its whole output lands in the log, so a fault is always diagnosable
  #   an enroll refusal (exit 2) is the caller's to fix, any other fault is not
  local status=0
  # .note = `${envs[@]+…}` expands an empty array to no word; a bare `"${envs[@]}"` trips `set -u` on bash < 4.4
  (cd "$dir" && env ${envs[@]+"${envs[@]}"} npx rhx "${args[@]}") >"$log" 2>&1 || status=$?
  local out=""
  out=$(cat "$log")
  # name the dir a human can read: `.` is this tree, any other is the temp worktree path
  local where="$dir"
  [[ "$dir" == "." ]] && where="this tree"
  if [[ "$status" -eq 2 ]]; then
    fail kind=constraint what="a probe enroll refused its args, in $where" detail="$out" hint="the full output is at $log"
  fi
  if [[ "$status" -ne 0 ]]; then
    fail kind=malfunction what="a probe clone failed, exit $status, in $where" detail="${out:-(the clone wrote no output)}" hint="the full output is at $log"
  fi

  # the result is the one json object the brain-cli emits with type=result
  #   `fromjson?` skips a line that is not json, by name; a fault of jq itself still fails loud
  local result=""
  if ! result=$(printf '%s\n' "$out" | jq -c -R 'fromjson? | select(type == "object" and .type == "result")' 2>&1 | tail -n 1); then
    fail kind=malfunction what="the probe output could not be scanned for its result json" detail="$result"
  fi
  if [[ -z "$result" ]]; then
    fail kind=malfunction what="a probe returned no result json, so no usage to measure" detail="$out"
  fi
  if [[ "$(printf '%s' "$result" | jq -r '.is_error // false')" == "true" ]]; then
    fail kind=malfunction what="a probe brain returned an error, not a measure" detail="$(printf '%s' "$result" | jq -r '.result // "(no result text)"')"
  fi

  # all three figures must be numbers; a partial usage is no measure
  local figures=""
  figures=$(printf '%s' "$result" | jq -r '
    .usage as $u
    | [$u.input_tokens, $u.cache_creation_input_tokens, $u.cache_read_input_tokens]
    | if all(type == "number") then map(tostring) | join("\t") else empty end')
  if [[ -z "$figures" ]]; then
    fail kind=malfunction what="a probe result held no usage figures" detail="$result"
  fi
  printf '%s\n' "$figures"
}

# the dir the second session runs in: this tree, or a temp worktree of HEAD
SECOND_DIR="."
if [[ "$ACROSS" == "worktree" ]]; then
  ROOT=$(git rev-parse --show-toplevel)

  # drop each temp worktree a prior failed run kept for diagnosis; its logs stay under .log/
  for KEPT in "$ROOT"/.temp/boot.cache.probe/*; do
    [[ -d "$KEPT" ]] && git -C "$ROOT" worktree remove --force "$KEPT" >/dev/null 2>&1 || true
  done
  git -C "$ROOT" worktree prune >/dev/null 2>&1 || true

  SECOND_DIR="$ROOT/.temp/boot.cache.probe/$(basename "$LOGDIR")"
  if ! git -C "$ROOT" worktree add --detach "$SECOND_DIR" HEAD >"$LOGDIR/worktree.log" 2>&1; then
    fail kind=malfunction what="the temp worktree could not be added" detail="$(cat "$LOGDIR/worktree.log")"
  fi
  # a clean run removes the temp worktree; a failed one keeps it, named, for diagnosis
  trap 'STATUS=$?; if [[ "$STATUS" -eq 0 ]]; then git -C "$ROOT" worktree remove --force "$SECOND_DIR" >/dev/null 2>&1 || true; else echo "   (temp worktree kept for diagnosis at $SECOND_DIR; the next --across worktree run drops it)" >&2; fi' EXIT

  # the same packages, and the same role links as this tree holds now: the role dirs are
  #   relative symlinks into node_modules, and repo=.this is copied as it stands, so the
  #   two boots differ by path alone
  ln -s "$ROOT/node_modules" "$SECOND_DIR/node_modules"

  # the build output too: `npx rhx` in a checkout of rhachet runs that checkout's own
  #   bin/run, which loads dist/ and the bun binaries — gitignored, so absent from a fresh
  #   worktree, where the launcher exits 1 with no output
  [[ -d "$ROOT/dist" ]] && ln -s "$ROOT/dist" "$SECOND_DIR/dist"
  for BC in "$ROOT"/bin/*.bc; do
    [[ -e "$BC" ]] && ln -s "$BC" "$SECOND_DIR/bin/$(basename "$BC")"
  done
  rm -rf "$SECOND_DIR/.agent/repo=.this"
  cp -RP "$ROOT"/.agent/repo=* "$SECOND_DIR/.agent/"
fi

P1="reply with exactly: OK"
P2="reply with exactly: YES"
OTEL_FIRST=""
OTEL_SECOND=""
if [[ "$DIFF" == "true" ]]; then
  OTEL_FIRST="$PWD/$LOGDIR/first"
  OTEL_SECOND="$PWD/$LOGDIR/second"
fi
# the tree streams: each run takes tens of seconds, so its block prints the moment it lands,
#   and the human never meets a silent wait
echo "🧮 boot.cache.probe --roles '$ROLES' --model $MODEL --across $ACROSS"
echo "   ├─ prompts differ per run, as two real sessions do"
if [[ "$ACROSS" == "worktree" ]]; then
  echo "   ├─ the second run starts in a temp worktree of HEAD, at another path"
fi

FIRST=$(probe prompt="$P1" dir="." otel="$OTEL_FIRST" log="$PWD/$LOGDIR/first.log")
IFS=$'\t' read -r F_IN F_W F_R <<< "$FIRST"
F_TOTAL=$((F_IN + F_W + F_R))

echo "   ├─ first run = $F_TOTAL tokens of prefix"
echo "   │  ├─ $F_IN fresh"
echo "   │  ├─ $F_W cache write"
echo "   │  └─ $F_R cache read"
# a warm first run is no fault of the probe, but it reads as one; name why it read
if (( F_TOTAL > 0 && F_R * 10 >= F_TOTAL * 9 )); then
  echo "   ├─ the first run read the boot too, since a session of this boot wrote it within the cache ttl"
fi

SECOND=$(probe prompt="$P2" dir="$SECOND_DIR" otel="$OTEL_SECOND" log="$PWD/$LOGDIR/second.log")
IFS=$'\t' read -r S_IN S_W S_R <<< "$SECOND"
S_TOTAL=$((S_IN + S_W + S_R))

# verdict on the second run: it should write under 5% of the first-call prefix, and read 90%
VERDICT="✗ the second session did not read the boot from cache"
if (( F_TOTAL > 0 && S_W * 20 < F_TOTAL && S_R * 10 >= F_TOTAL * 9 )); then
  VERDICT="✓ the second session read the boot from cache"
fi

echo "   ├─ second run = $S_TOTAL tokens of prefix"
echo "   │  ├─ $S_IN fresh"
echo "   │  ├─ $S_W cache write"
echo "   │  └─ $S_R cache read"
if [[ "$DIFF" != "true" ]]; then
  echo "   └─ $VERDICT"
  exit 0
fi

# the opener of a log dir is the first row of its index.jsonl (send order); body files are
#   named by a random uuid, so a sort of the dir would pick an arbitrary request
# .note = named args: dir=<log dir>
opener_of() {
  local dir="${1#dir=}"
  [[ -f "$dir/index.jsonl" ]] || return 0
  local file=""
  # a parse fault fails loud, never reads as an absent body
  if ! file=$(head -n 1 "$dir/index.jsonl" | jq -r '.request_file // empty' 2>&1); then
    fail kind=malfunction what="the first request row under $dir could not be parsed as json" detail="$file"
  fi
  [[ -n "$file" && -f "$dir/$file" ]] && echo "$dir/$file"
  return 0
}
F_BODY=$(opener_of dir="$LOGDIR/first")
S_BODY=$(opener_of dir="$LOGDIR/second")
if [[ -z "$F_BODY" || -z "$S_BODY" ]]; then
  echo "   └─ $VERDICT"
  fail kind=malfunction what="--diff found no raw request bodies under $LOGDIR" hint="the brain-cli writes them only when OTEL_LOG_RAW_API_BODIES=file:<dir> reaches it; check its version and env"
fi

# a body that is no json is a malfunction, named, never a raw jq fault
# .note = named args: path=<body>
assert_json() {
  local path="${1#path=}"
  if ! jq -e 'type == "object"' "$path" >/dev/null 2>&1; then
    fail kind=malfunction what="a raw request body is not a json object" detail="$path"
  fi
}
assert_json path="$F_BODY"
assert_json path="$S_BODY"
# the first byte that differs, read off cmp's own exit: 0 = equal, 1 = differ, else a fault
#   that fails loud, so a broken read never renders as byte-equal
CMP_OUT=""
CMP_STATUS=0
CMP_OUT=$(cmp "$F_BODY" "$S_BODY" 2>&1) || CMP_STATUS=$?
if (( CMP_STATUS > 1 )); then
  fail kind=malfunction what="the two raw request bodies could not be compared" detail="$CMP_OUT"
fi
OFFSET=""
if (( CMP_STATUS == 1 )); then
  OFFSET=$(printf '%s\n' "$CMP_OUT" | grep -oE '(byte|char) [0-9]+' | head -n 1 | grep -oE '[0-9]+' || true)
  # an EOF means one body is a prefix of the other: the byte past the shorter one differs
  if [[ "$CMP_OUT" == *EOF* ]]; then OFFSET=$(( ${OFFSET:-0} + 1 )); fi
  if [[ -z "$OFFSET" ]]; then
    fail kind=malfunction what="cmp said the bodies differ but named no offset" detail="$CMP_OUT"
  fi
fi

# render one list of request blocks as tree rows; `· breakpoint` marks a cache_control block
# .note = named args: path=<body> select=<jq path to the block array>
blocks_of() {
  local path="" select="" arg
  for arg in "$@"; do
    case "$arg" in
      path=*) path="${arg#path=}" ;;
      select=*) select="${arg#select=}" ;;
    esac
  done
  jq -r "$select"' | if type == "array" then . else [] end | to_entries[]
    | "[\(.key)] \(.value.text // "" | length) chars\(if .value.cache_control then " · breakpoint" else "" end) · \(.value.text // "" | .[0:60] | gsub("\n"; " "))"' "$path" \
    | while IFS= read -r ROW; do
        echo "   │  ├─ $ROW"
      done
}

echo "   ├─ $VERDICT"
echo "   ├─ system blocks, in request order (first run)"
blocks_of path="$F_BODY" select='.system // []'
echo "   │  └─ the boot splits at its boundary line when claude honors it"
echo "   ├─ first message blocks, in request order (first run)"
blocks_of path="$F_BODY" select='.messages[0].content // []'
echo "   │  └─ a breakpoint ends the prefix the cache can share"
echo "   ├─ breakpoints outside the first message"
echo "   │  ├─ system = $(jq -r '[.system // [] | if type == "array" then .[] else empty end | select(.cache_control)] | length' "$F_BODY") marked"
echo "   │  └─ tools = $(jq -r '[.tools // [] | .[] | select(.cache_control)] | length' "$F_BODY") marked"
echo "   │"
echo "   └─ request bodies"
echo "      ├─ first = $F_BODY"
echo "      ├─ second = $S_BODY"
if [[ -z "$OFFSET" ]]; then
  echo "      └─ byte-equal"
  exit 0
fi
START=$(( OFFSET > 120 ? OFFSET - 120 : 1 ))
# the offset is into the request file, whose key order is not the cache order (tools, system,
#   messages); name the top-level key that holds it, so the reader knows if the boot is shared.
#   a key inside a json string is escaped (\"system\":), so only a real key matches
KEY=$(head -c "$OFFSET" "$F_BODY" | grep -oE '"(model|messages|system|tools|metadata|max_tokens|temperature|stream)":' | tail -n 1 | tr -d '":' || true)
case "$KEY" in
  messages) WHERE="in messages, after the boot, so the boot prefix is still shared" ;;
  system|tools) WHERE="in $KEY, ahead of or inside the boot, so the boot is not shared" ;;
  *) WHERE="in ${KEY:-an unnamed key}, a key this probe does not place in the cache order" ;;
esac
echo "      ├─ first byte that differs = $OFFSET of the request file"
echo "      ├─ $WHERE"
echo "      ├─ first, around it"
echo "      │  └─ $(tail -c +"$START" "$F_BODY" | head -c 240 | tr '\n' ' ')"
echo "      └─ second, around it"
echo "         └─ $(tail -c +"$START" "$S_BODY" | head -c 240 | tr '\n' ' ')"
