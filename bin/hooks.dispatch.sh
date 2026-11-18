#!/usr/bin/env bash
######################################################################
# .what = one claude hook process per event: run every role rule the
#         manifest names for this event, then merge their verdicts
#
# .why  = claude forked one process per role rule per tool call — three
#         of them an rhx boot. one bash process that runs each rule as a
#         subshell pays one boot, and each rule decides exactly as before
#
# usage (written into settings.of.repo.json by `rhx init --hooks`):
#   bash ./node_modules/rhachet/bin/hooks.dispatch.sh <manifest> <Event>
#
# manifest = one row per rule, fields split by \x1f, args split by \x1e:
#   event · matcher · timeout · author · kind · path · frame · args · command · when
#   kind ∈ rhx-skill | rhx-init | shell | exec | foreign
#
# the merge, as claude merges separate hooks:
#   - any rule exits 2  → every exit-2 rule's stderr, in manifest order; exit 2
#   - else, a rule emits a json decision (or the event reads stdout as
#     context) → that stdout, exit 0; a crashed rule beside it rides in the
#     json `systemMessage`, so the human still sees it
#   - else, a rule crashed → its stderr; exit with its code (a non-block)
#   - else → every rule's stdout, in manifest order; exit 0
#   - a rule past its timeout is killed, its children with it, and counted
#     as a crash (exit 124, as timeout(1) exits)
#
# guarantee:
#   - each rule runs in its own subshell, with the event's stdin, $0 set
#     to its path, default shell options, and none of this file's names
#     in scope; on bash < 5, or where the rule reads `$$`, it runs as
#     `bash <path>` instead
#   - an rhx rule prints the frame `rhx` printed (`🪨 run solid skill …`,
#     `💪 init role …`), and its stderr only on a nonzero exit, trimmed
#   - an absent manifest fails closed: exit 2, with the fix named
######################################################################

__rhx_dispatch_manifest="${1:-}"
__rhx_dispatch_event="${2:-}"

# fail closed when the manifest is absent: a guard that cannot load must never allow
if [[ -z "$__rhx_dispatch_manifest" || ! -f "$__rhx_dispatch_manifest" ]]; then
  printf '%s\n' "✋ ConstraintError: hook dispatch manifest not found" >&2
  printf '%s\n' "   ├─ manifest = ${__rhx_dispatch_manifest:-(none given)}" >&2
  printf '%s\n' "   ├─ event = ${__rhx_dispatch_event:-(none given)}" >&2
  printf '%s\n' "   └─ fix = run \`npx rhx init --hooks\` to rewrite it" >&2
  exit 2
fi

# read the event payload once; every rule reads its own copy
__rhx_dispatch_payload=''
IFS= read -r -d '' __rhx_dispatch_payload

# the key the event's matcher reads, per claude's hooks reference
__rhx_dispatch_key=''
case "$__rhx_dispatch_event" in
  PreToolUse | PostToolUse | PostToolUseFailure | PermissionRequest) __rhx_dispatch_keyname='tool_name' ;;
  SessionStart) __rhx_dispatch_keyname='source' ;;
  PreCompact | PostCompact) __rhx_dispatch_keyname='trigger' ;;
  Notification) __rhx_dispatch_keyname='notification_type' ;;
  SessionEnd) __rhx_dispatch_keyname='reason' ;;
  *) __rhx_dispatch_keyname='' ;;
esac
if [[ -n "$__rhx_dispatch_keyname" ]]; then
  __rhx_dispatch_re="\"${__rhx_dispatch_keyname}\"[[:space:]]*:[[:space:]]*\"([^\"]*)\""
  [[ "$__rhx_dispatch_payload" =~ $__rhx_dispatch_re ]] && __rhx_dispatch_key="${BASH_REMATCH[1]}"
fi

# the per-call files: the payload, then each rule's stdout and stderr
__rhx_dispatch_base="${TMPDIR:-/tmp}/rhachet.hooks.dispatch.$$."
printf '%s' "$__rhx_dispatch_payload" > "${__rhx_dispatch_base}in"

# a sourced rule needs bash ≥ 5 (BASH_ARGV0); below that, a rule runs as `bash <path>`
# .note = RHACHET_HOOKS_DISPATCH_SOURCE=0 asks for `bash <path>` on any bash: an operator's way
#   out if a rule ever misbehaves when sourced, and the way a test reaches the bash < 5 path
__rhx_dispatch_sourced=0
(( BASH_VERSINFO[0] >= 5 )) && [[ "${RHACHET_HOOKS_DISPATCH_SOURCE:-1}" != 0 ]] && __rhx_dispatch_sourced=1

# select the rules that fit this event and its matcher, in manifest order
__rhx_dispatch_n=0
__rhx_dispatch_us=$'\x1f'
while IFS="$__rhx_dispatch_us" read -r __rhx_dispatch_f_event __rhx_dispatch_f_matcher __rhx_dispatch_f_timeout __rhx_dispatch_f_author __rhx_dispatch_f_kind __rhx_dispatch_f_path __rhx_dispatch_f_frame __rhx_dispatch_f_args __rhx_dispatch_f_command __rhx_dispatch_f_when || [[ -n "$__rhx_dispatch_f_event" ]]; do
  [[ -z "$__rhx_dispatch_f_event" || "$__rhx_dispatch_f_event" == \#* ]] && continue
  [[ "$__rhx_dispatch_f_event" != "$__rhx_dispatch_event" ]] && continue

  # match by claude's matcher grammar: `*` or empty = all; letters, digits, `_`, `|`, `,` = an exact list; else an unanchored regex
  __rhx_dispatch_fit=0
  if [[ -z "$__rhx_dispatch_f_matcher" || "$__rhx_dispatch_f_matcher" == '*' || -z "$__rhx_dispatch_keyname" ]]; then
    __rhx_dispatch_fit=1
  elif [[ "$__rhx_dispatch_f_matcher" =~ ^[A-Za-z0-9_|,]+$ ]]; then
    case "|${__rhx_dispatch_f_matcher//,/|}|" in
      *"|${__rhx_dispatch_key}|"*) __rhx_dispatch_fit=1 ;;
    esac
  elif [[ "$__rhx_dispatch_key" =~ $__rhx_dispatch_f_matcher ]]; then
    __rhx_dispatch_fit=1
  fi
  [[ "$__rhx_dispatch_fit" == 1 ]] || continue

  __rhx_dispatch_timeout[__rhx_dispatch_n]="${__rhx_dispatch_f_timeout:-60}"
  __rhx_dispatch_kind[__rhx_dispatch_n]="$__rhx_dispatch_f_kind"
  __rhx_dispatch_path[__rhx_dispatch_n]="$__rhx_dispatch_f_path"
  __rhx_dispatch_frame[__rhx_dispatch_n]="$__rhx_dispatch_f_frame"
  __rhx_dispatch_args[__rhx_dispatch_n]="$__rhx_dispatch_f_args"
  __rhx_dispatch_command[__rhx_dispatch_n]="$__rhx_dispatch_f_command"
  __rhx_dispatch_n=$((__rhx_dispatch_n + 1))
done < "$__rhx_dispatch_manifest"

# start each rule in its own subshell, all at once
__rhx_dispatch_i=0
while (( __rhx_dispatch_i < __rhx_dispatch_n )); do
  __rhx_dispatch_k="${__rhx_dispatch_kind[__rhx_dispatch_i]}"
  __rhx_dispatch_p="${__rhx_dispatch_path[__rhx_dispatch_i]}"

  # a rule file that vanished since the sync runs as declared
  if [[ "$__rhx_dispatch_k" != foreign && ! -f "$__rhx_dispatch_p" ]]; then
    __rhx_dispatch_k=foreign
    __rhx_dispatch_kind[__rhx_dispatch_i]=foreign
    __rhx_dispatch_frame[__rhx_dispatch_i]=''
  fi

  # rhx ran a skill by its absolute path; `bash <path>` ran it by the path as declared
  [[ "$__rhx_dispatch_k" == rhx-skill || "$__rhx_dispatch_k" == rhx-init ]] && __rhx_dispatch_p="$PWD/$__rhx_dispatch_p"

  (
    # a rule that reads `$$` runs as its own process: a sourced subshell would read the dispatcher's pid
    __rhx_dispatch_src=''
    [[ "$__rhx_dispatch_sourced" == 1 && "$__rhx_dispatch_k" != foreign && "$__rhx_dispatch_k" != exec ]] && IFS= read -r -d '' __rhx_dispatch_src < "$__rhx_dispatch_p"
    [[ "$__rhx_dispatch_src" == *'$$'* ]] && __rhx_dispatch_sourced=0

    # the rule's kind, path, command and args become the positional params
    __rhx_dispatch_argv=()
    [[ -n "${__rhx_dispatch_args[__rhx_dispatch_i]}" ]] && IFS=$'\x1e' read -r -a __rhx_dispatch_argv <<< "${__rhx_dispatch_args[__rhx_dispatch_i]}"
    set -- "$__rhx_dispatch_k" "$__rhx_dispatch_p" "${__rhx_dispatch_command[__rhx_dispatch_i]}" "$__rhx_dispatch_sourced" "${__rhx_dispatch_argv[@]}"
    exec < "${__rhx_dispatch_base}in" > "${__rhx_dispatch_base}${__rhx_dispatch_i}.out" 2> "${__rhx_dispatch_base}${__rhx_dispatch_i}.err"

    # then this file's names leave scope, so the rule sees the shell its own process saw
    unset "${!__rhx_dispatch_@}"

    # a declared command with no rule file runs as claude ran it
    [[ "$1" == foreign ]] && exec /bin/sh -c "$3"

    # a file with a shebang other than bash runs as its own process, as rhx ran it
    [[ "$1" == exec ]] && exec "$2" "${@:5}"

    # bash < 5: no BASH_ARGV0, so the rule runs as `bash <path>`
    [[ "$4" == 0 ]] && exec bash "$2" "${@:5}"

    # bash ≥ 5: source the rule with $0 set to its path, as its own process would see it
    BASH_ARGV0="$2"
    set -- "${@:5}"
    source "$0" "$@"
  ) &
  __rhx_dispatch_pid[__rhx_dispatch_i]=$!
  __rhx_dispatch_i=$((__rhx_dispatch_i + 1))
done

# a watchdog kills each rule that outlives its timeout, and marks it so the merge reads a crash
__rhx_dispatch_wd=''
if (( __rhx_dispatch_n > 0 )); then
  (
    trap 'kill "$__rhx_dispatch_sleep" 2>/dev/null; exit 0' TERM
    __rhx_dispatch_elapsed=0
    while :; do
      # the next deadline among the rules still alive
      __rhx_dispatch_next=''
      __rhx_dispatch_j=0
      while (( __rhx_dispatch_j < __rhx_dispatch_n )); do
        __rhx_dispatch_t="${__rhx_dispatch_timeout[__rhx_dispatch_j]}"
        if (( __rhx_dispatch_t > __rhx_dispatch_elapsed )) && kill -0 "${__rhx_dispatch_pid[__rhx_dispatch_j]}" 2>/dev/null; then
          if [[ -z "$__rhx_dispatch_next" ]] || (( __rhx_dispatch_t < __rhx_dispatch_next )); then
            __rhx_dispatch_next="$__rhx_dispatch_t"
          fi
        fi
        __rhx_dispatch_j=$((__rhx_dispatch_j + 1))
      done
      [[ -z "$__rhx_dispatch_next" ]] && exit 0
      sleep $((__rhx_dispatch_next - __rhx_dispatch_elapsed)) &
      __rhx_dispatch_sleep=$!
      wait "$__rhx_dispatch_sleep"
      __rhx_dispatch_elapsed="$__rhx_dispatch_next"

      # kill each rule whose deadline passed
      __rhx_dispatch_j=0
      while (( __rhx_dispatch_j < __rhx_dispatch_n )); do
        if (( __rhx_dispatch_timeout[__rhx_dispatch_j] <= __rhx_dispatch_elapsed )) && kill -0 "${__rhx_dispatch_pid[__rhx_dispatch_j]}" 2>/dev/null; then
          : > "${__rhx_dispatch_base}${__rhx_dispatch_j}.timeout"
          # the rule's own children first, so a killed rule leaves none behind (one fork, only on a timeout)
          command -v pkill > /dev/null && pkill -TERM -P "${__rhx_dispatch_pid[__rhx_dispatch_j]}" 2>/dev/null
          kill -TERM "${__rhx_dispatch_pid[__rhx_dispatch_j]}" 2>/dev/null
        fi
        __rhx_dispatch_j=$((__rhx_dispatch_j + 1))
      done
    done
  ) &
  __rhx_dispatch_wd=$!
fi

# collect each rule's exit code, in manifest order
__rhx_dispatch_i=0
while (( __rhx_dispatch_i < __rhx_dispatch_n )); do
  wait "${__rhx_dispatch_pid[__rhx_dispatch_i]}"
  __rhx_dispatch_code[__rhx_dispatch_i]=$?
  # a timeout counts only if the kill landed: a rule that finished before its reap keeps its own
  # verdict, since `kill -0` sees an unreaped child as alive and a kill leaves its exit untouched
  [[ -f "${__rhx_dispatch_base}${__rhx_dispatch_i}.timeout" ]] && (( __rhx_dispatch_code[__rhx_dispatch_i] != 0 && __rhx_dispatch_code[__rhx_dispatch_i] != 2 )) && __rhx_dispatch_code[__rhx_dispatch_i]=124
  __rhx_dispatch_i=$((__rhx_dispatch_i + 1))
done
if [[ -n "$__rhx_dispatch_wd" ]]; then
  kill -TERM "$__rhx_dispatch_wd" 2>/dev/null
  wait "$__rhx_dispatch_wd" 2>/dev/null
fi

# bun paints console.error red when FORCE_COLOR is set, or stderr is a tty, and NO_COLOR is not
__rhx_dispatch_r0=''
__rhx_dispatch_r1=''
if [[ -z "${NO_COLOR:-}" ]]; then
  if [[ -n "${FORCE_COLOR:-}" && "${FORCE_COLOR}" != 0 && "${FORCE_COLOR}" != false ]] || [[ -t 2 ]]; then
    __rhx_dispatch_r0=$'\e[0m\e[31m'
    __rhx_dispatch_r1=$'\e[0m'
  fi
fi

# read each rule's stdout and stderr; frame the rhx rules as rhx framed them
__rhx_dispatch_blocked=0
__rhx_dispatch_crashed=0
__rhx_dispatch_json=''
__rhx_dispatch_stdout=''
__rhx_dispatch_err_block=''
__rhx_dispatch_err_crash=''
__rhx_dispatch_i=0
while (( __rhx_dispatch_i < __rhx_dispatch_n )); do
  __rhx_dispatch_o=''
  __rhx_dispatch_e=''
  IFS= read -r -d '' __rhx_dispatch_o < "${__rhx_dispatch_base}${__rhx_dispatch_i}.out"
  IFS= read -r -d '' __rhx_dispatch_e < "${__rhx_dispatch_base}${__rhx_dispatch_i}.err"
  __rhx_dispatch_c="${__rhx_dispatch_code[__rhx_dispatch_i]}"
  __rhx_dispatch_fr="${__rhx_dispatch_frame[__rhx_dispatch_i]}"

  # a timeout names itself, so the human sees which rule hung
  if (( __rhx_dispatch_c == 124 )) && [[ -f "${__rhx_dispatch_base}${__rhx_dispatch_i}.timeout" ]]; then
    __rhx_dispatch_e="${__rhx_dispatch_e}💥 MalfunctionError: hook rule timed out after ${__rhx_dispatch_timeout[__rhx_dispatch_i]}s (${__rhx_dispatch_path[__rhx_dispatch_i]:-${__rhx_dispatch_command[__rhx_dispatch_i]}})"$'\n'
  fi

  # an rhx rule: the frame leads its stdout; its stderr shows only on a nonzero exit, framed and trimmed
  if [[ -n "$__rhx_dispatch_fr" ]]; then
    __rhx_dispatch_o=$'\n'"${__rhx_dispatch_fr}"$'\n\n'"${__rhx_dispatch_o}"
    (( __rhx_dispatch_c == 0 )) && __rhx_dispatch_e=''
    if (( __rhx_dispatch_c != 0 )); then
      __rhx_dispatch_t="${__rhx_dispatch_e#"${__rhx_dispatch_e%%[![:space:]]*}"}"
      __rhx_dispatch_t="${__rhx_dispatch_t%"${__rhx_dispatch_t##*[![:space:]]}"}"
      __rhx_dispatch_st='   └─ 💥 failed with an error'
      (( __rhx_dispatch_c == 2 )) && __rhx_dispatch_st='   └─ ✋ blocked by constraints'
      # each line rhx wrote via console.error, which bun paints red where it paints color
      __rhx_dispatch_e="${__rhx_dispatch_r0}${__rhx_dispatch_r1}"$'\n'
      __rhx_dispatch_e="${__rhx_dispatch_e}${__rhx_dispatch_r0}${__rhx_dispatch_fr}${__rhx_dispatch_r1}"$'\n'
      __rhx_dispatch_e="${__rhx_dispatch_e}${__rhx_dispatch_r0}${__rhx_dispatch_st}${__rhx_dispatch_r1}"$'\n'
      __rhx_dispatch_e="${__rhx_dispatch_e}${__rhx_dispatch_r0}${__rhx_dispatch_r1}"$'\n'
      [[ -n "$__rhx_dispatch_t" ]] && __rhx_dispatch_e="${__rhx_dispatch_e}${__rhx_dispatch_r0}${__rhx_dispatch_t}${__rhx_dispatch_r1}"$'\n'
    fi
  fi

  # tally the verdict, and route the bytes by it
  if (( __rhx_dispatch_c == 2 )); then
    __rhx_dispatch_blocked=1
    __rhx_dispatch_err_block="${__rhx_dispatch_err_block}${__rhx_dispatch_e}"
  fi
  if (( __rhx_dispatch_c != 0 && __rhx_dispatch_c != 2 )); then
    (( __rhx_dispatch_crashed == 0 )) && __rhx_dispatch_crashed="$__rhx_dispatch_c"
    __rhx_dispatch_err_crash="${__rhx_dispatch_err_crash}${__rhx_dispatch_e}"
  fi
  if (( __rhx_dispatch_c == 0 )); then
    # a json decision is the whole of its rule's stdout; the first one is kept whole
    __rhx_dispatch_t="${__rhx_dispatch_o#"${__rhx_dispatch_o%%[![:space:]]*}"}"
    [[ -z "$__rhx_dispatch_json" && "$__rhx_dispatch_t" == \{* ]] && __rhx_dispatch_json="$__rhx_dispatch_o"
    __rhx_dispatch_stdout="${__rhx_dispatch_stdout}${__rhx_dispatch_o}"
  fi
  __rhx_dispatch_i=$((__rhx_dispatch_i + 1))
done
rm -f "${__rhx_dispatch_base}"*

# .what = a string as a json string literal, into __rhx_dispatch_js (a function, so no subshell fork)
__rhx_dispatch_as_json_string() {
  __rhx_dispatch_js="${1//\\/\\\\}"
  __rhx_dispatch_js="${__rhx_dispatch_js//\"/\\\"}"
  __rhx_dispatch_js="${__rhx_dispatch_js//$'\n'/\\n}"
  __rhx_dispatch_js="${__rhx_dispatch_js//$'\r'/\\r}"
  __rhx_dispatch_js="${__rhx_dispatch_js//$'\t'/\\t}"
  __rhx_dispatch_js="${__rhx_dispatch_js//$'\e'/\\u001b}"
  __rhx_dispatch_js="\"${__rhx_dispatch_js}\""
}

# a block wins: every blocker's stderr, in manifest order
if (( __rhx_dispatch_blocked == 1 )); then
  printf '%s' "$__rhx_dispatch_err_block" >&2
  exit 2
fi

# stdout that claude reads (a json decision; plain text on a context event) survives a crash beside it
__rhx_dispatch_reads=0
[[ -n "$__rhx_dispatch_json" ]] && __rhx_dispatch_reads=1
case "$__rhx_dispatch_event" in
  SessionStart | UserPromptSubmit) [[ -n "$__rhx_dispatch_stdout" ]] && __rhx_dispatch_reads=1 ;;
esac

# a crash with no stdout claude reads: its stderr, its code — a non-block, as before
if (( __rhx_dispatch_crashed != 0 && __rhx_dispatch_reads == 0 )); then
  printf '%s' "$__rhx_dispatch_err_crash" >&2
  exit "$__rhx_dispatch_crashed"
fi

# a crash beside stdout claude reads: the decision holds (exit 0), and the crash reaches the human
# as the json `systemMessage`, since one process carries one exit code, never a decision and a crash
[[ -n "$__rhx_dispatch_err_crash" ]] && printf '%s' "$__rhx_dispatch_err_crash" >&2
if (( __rhx_dispatch_crashed != 0 )); then
  __rhx_dispatch_as_json_string "$__rhx_dispatch_err_crash"
  __rhx_dispatch_jsc="$__rhx_dispatch_js"
  # plain context becomes the json form of the same context, so it can carry the message beside it
  if [[ -z "$__rhx_dispatch_json" ]]; then
    __rhx_dispatch_as_json_string "$__rhx_dispatch_stdout"
    __rhx_dispatch_json="{\"hookSpecificOutput\":{\"hookEventName\":\"${__rhx_dispatch_event}\",\"additionalContext\":${__rhx_dispatch_js}}}"
  fi
  # a rule's own systemMessage is kept; the crash then shows on stderr alone
  if [[ "$__rhx_dispatch_json" != *'"systemMessage"'* ]]; then
    __rhx_dispatch_rest="${__rhx_dispatch_json#*\{}"
    __rhx_dispatch_t="${__rhx_dispatch_rest#"${__rhx_dispatch_rest%%[![:space:]]*}"}"
    __rhx_dispatch_sep=','
    [[ "$__rhx_dispatch_t" == \}* ]] && __rhx_dispatch_sep=''
    __rhx_dispatch_json="{\"systemMessage\":${__rhx_dispatch_jsc}${__rhx_dispatch_sep}${__rhx_dispatch_rest}"
  fi
fi

# the stdout claude reads: the json decision whole, else every rule's text in manifest order
if [[ -n "$__rhx_dispatch_json" ]]; then
  printf '%s' "$__rhx_dispatch_json"
  exit 0
fi
printf '%s' "$__rhx_dispatch_stdout"
exit 0
