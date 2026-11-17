#!/usr/bin/env bash
######################################################################
# 🧮 clone.cache.usage — the prompt-cache usage of each api call in a clone
#
# .what = show the prompt-cache usage of each api call in a clone's
#         brain-cli transcript: fresh input, cache write, cache read
#
# .why  = the boot prefix is a cache win only if each call after the
#         first reads it from cache. the transcript records the usage
#         the api returned per call, so the figure is measured, never
#         guessed. one call per row; content blocks of one message are
#         folded by message id.
#
# usage:
#   run `rhx clone.cache.usage help` — `show_help()` below is the one source,
#   pinned by `clone.cache.usage.integration.test.ts`
#
# guarantee:
#   - read-only
#   - exit 0 = shown, 1 = a transcript could not be parsed, 2 = bad input
#
# .note = the domain-root 🧮 roots every line; no role mascot (rule.prefer.emoji-language)
######################################################################
set -euo pipefail

ORIGINAL_ARGS=("$@")

# ONE help text, reached from both call sites (a direct call, and an `rhx` call)
show_help() {
  echo "🧮 clone.cache.usage — the prompt-cache usage of each api call in a clone"
  echo "   ├─ usage"
  echo "   │  └─ rhx clone.cache.usage (--transcript <path.jsonl> | --clone <dir>) [--head <n>]"
  echo "   ├─ options"
  echo "   │  ├─ --transcript   a brain-cli transcript (.jsonl); may repeat"
  echo "   │  ├─ --clone        a clone dir; reads every history/*.jsonl in it"
  echo "   │  └─ --head         show only the first n calls of each transcript; all when absent"
  echo "   ├─ exits"
  echo "   │  ├─ 0 = shown"
  echo "   │  ├─ 1 = a transcript could not be parsed"
  echo "   │  └─ 2 = bad input — an absent value, an unknown flag, or no transcript found"
  echo "   └─ examples"
  echo "      ├─ rhx clone.cache.usage --clone .agent/.actors/actor.via.repo=ambient/clones/serial=<uuid>"
  echo "      └─ rhx clone.cache.usage --transcript <path.jsonl> --head 5"
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
  echo "🧮 clone.cache.usage" >&2
  echo "   ├─ ran = rhx clone.cache.usage ${ORIGINAL_ARGS[*]}" >&2
  echo "   ├─ $header" >&2
  if [[ -n "$detail" ]]; then
    echo "   ├─ detail" >&2
    printf '%s\n' "$detail" | tail -n 20 | while IFS= read -r ROW; do
      echo "   │  │ $ROW" >&2
    done
  fi
  echo "   └─ hint = ${hint:-rhx clone.cache.usage help}" >&2
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

TRANSCRIPTS=()
HEAD=0

while [[ $# -gt 0 ]]; do
  case $1 in
    --transcript)
      require_val flag=--transcript value="${2:-}"
      TRANSCRIPTS+=("$2")
      shift 2
      ;;
    --clone)
      require_val flag=--clone value="${2:-}"
      if [[ ! -d "$2" ]]; then
        fail kind=constraint what="clone dir not found, $2" hint="list clone dirs with rhx globsafe --pattern '.agent/.actors/*/clones/serial=*'"
      fi
      FOUND=0
      for f in "$2"/history/*.jsonl; do
        [[ -e "$f" ]] && TRANSCRIPTS+=("$f") && FOUND=1
      done
      if [[ "$FOUND" -eq 0 ]]; then
        fail kind=constraint what="the clone holds no history transcript, $2/history/*.jsonl matched no file" hint="a clone keeps history once its brain-cli writes a turn; for a one-shot -p run, read .usage from rhx enroll claude -p '<prompt>' --output-format json"
      fi
      shift 2
      ;;
    --head)
      require_val flag=--head value="${2:-}"
      if [[ ! "$2" =~ ^[0-9]+$ ]]; then
        fail kind=constraint what="invalid --head value $2" hint="pass a non-negative integer, e.g. --head 5"
      fi
      HEAD="$2"
      shift 2
      ;;
    --repo|--role|--skill)
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

if [[ ${#TRANSCRIPTS[@]} -eq 0 ]]; then
  fail kind=constraint what="no transcript given" hint="pass --transcript <path.jsonl> or --clone <dir>"
fi

# every transcript must exist before the tree opens
for T in "${TRANSCRIPTS[@]}"; do
  if [[ ! -f "$T" ]]; then
    fail kind=constraint what="transcript not found, $T"
  fi
done

echo "🧮 clone.cache.usage"

for T in "${TRANSCRIPTS[@]}"; do
  # one row per api call, in the order the calls were made; content blocks share a message id,
  #   so keep the last usage of each id at the place its id first appeared. a `<synthetic>` row
  #   is the brain-cli's own note (no api call, all-zero usage), so it is no call.
  #   a transcript that is no json lines is a named malfunction, never a raw jq fault
  ROWS=""
  if ! ROWS=$(jq -r -s --argjson head "$HEAD" '
    [ .[] | select(.type == "assistant" and .message.usage != null and .message.model != "<synthetic>")
          | { id: .message.id, u: .message.usage } ]
    | reduce .[] as $call ({ order: [], last: {} };
        (if .last[$call.id] == null then .order += [$call.id] else . end)
        | .last[$call.id] = $call.u)
    | . as $seen
    | [ $seen.order[] | $seen.last[.] ]
    | (if $head > 0 then .[0:$head] else . end)
    | to_entries[]
    | "\(.key + 1)\t\(.value.input_tokens // 0)\t\(.value.cache_creation_input_tokens // 0)\t\(.value.cache_read_input_tokens // 0)"
  ' "$T" 2>&1); then
    # some jq builds prefix their own name to the fault ("jq: parse error"), some do not; drop it,
    #   so the detail reads one way on every host
    fail kind=malfunction what="a transcript could not be parsed as json lines, $T" detail="${ROWS#jq: }" hint="a transcript in mid-write may hold a partial line; re-run once the clone is idle"
  fi

  echo "   ├─ transcript = $(basename "$T")"
  echo "   │  ├─ calls (n · fresh · cache write · cache read)"
  # the last call takes └─, every other ├─
  LAST=$(printf '%s\n' "$ROWS" | awk -F'\t' 'NF==4' | wc -l)
  while IFS=$'\t' read -r N IN CW CR; do
    [[ -z "$N" ]] && continue
    GLYPH="├─"
    [[ "$N" -eq "$LAST" ]] && GLYPH="└─"
    printf '   │  │  %s %3s · %8s fresh · %8s write · %8s read\n' "$GLYPH" "$N" "$IN" "$CW" "$CR"
  done <<< "$ROWS"
  TOTALS=$(echo "$ROWS" | awk -F'\t' 'NF==4 { n++; i+=$2; w+=$3; r+=$4 } END { printf "%d\t%d\t%d\t%d", n, i, w, r }')
  IFS=$'\t' read -r TN TI TW TR <<< "$TOTALS"
  echo "   │  │"
  echo "   │  └─ totals"
  echo "   │     ├─ $TN calls"
  echo "   │     ├─ $TI fresh"
  echo "   │     ├─ $TW cache write"
  echo "   │     └─ $TR cache read"
done
echo "   └─ done"
