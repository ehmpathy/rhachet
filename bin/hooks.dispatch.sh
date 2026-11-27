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
#   - any rule exits 2  → every exit-2 rule's stderr, in manifest order,
#     then any crashed rule's stderr, then one `🪝 … blocked by <rule>` line
#     per blocker (claude's label names the dispatcher); exit 2
#   - else, a rule emits a json decision (or the event reads stdout as
#     context) → that stdout, exit 0; of several json decisions, the strongest
#     is kept whole (deny > ask > allow, as claude ranks them), the first of
#     equal rank; a crashed rule beside it rides in the json `systemMessage`
#   - else, a rule crashed → its stderr; exit with its code (a non-block); a
#     crash that wrote no stderr names its rule, since claude labels the
#     dispatcher, not the rule
#   - else → every rule's stdout, in manifest order; exit 0
#   - a rule past its timeout is sent TERM, then KILL after a 2s grace, and
#     counted as a crash (exit 124, as timeout(1) exits) whatever code its own
#     traps then exit with; a child it forked is not killed, as under claude
#   - a rule whose matcher is no valid regex runs not, and counts as a crash
#   - a PermissionRequest decision (`"decision":{"behavior":…}`) ranks as the
#     PreToolUse one does
#
# guarantee:
#   - each rule runs in its own subshell, with the event's stdin, $0 set
#     to its path, default shell options, and none of this file's names
#     in scope; on bash < 5, or where the rule reads `$$`, it runs as
#     `bash <path>` instead
#   - the `$$` scan reads the rule file alone: a lib the rule sources that
#     reads `$$` sees this process's pid, shared by every sourced rule of
#     the event (a lock or temp name keyed on `$$` must not assume it is
#     the rule's own)
#   - an rhx rule prints the frame `rhx` printed (`🪨 run solid skill …`,
#     `💪 init role …`), and its stderr only on a nonzero exit, trimmed
#   - an absent manifest, one of a version other than v1, a row it cannot
#     read, or per-call files it cannot create, fails closed with the fix
#     named: exit 2, save on UserPromptSubmit and on a Stop claude already
#     held (`stop_hook_active`), which exit 1, so no seat is held in a loop
#   - the per-call files are private (umask 077), named by pid plus a
#     random part, created under noclobber so a planted entry is never
#     written through, and removed on any exit
#   - on a Stop claude already held (`stop_hook_active`), each rule runs with
#     RHACHET_HOOKS_STOP_HELD=1 in its env
#   - RHACHET_HOOKS_DISPATCH_TRACE=<file> appends which rules ran or were
#     skipped, each exit, and the verdict to that file; stdout and stderr
#     are unchanged
######################################################################

__rhx_dispatch_manifest="${1:-}"
__rhx_dispatch_event="${2:-}"

# read the event payload once; every rule reads its own copy
# .note = `cat` reads the pipe in one buffered pass; bash's own `read` takes a pipe one byte per
#   syscall, so a 1 MB Write payload would cost a million reads. the `.` sentinel keeps every
#   final newline of the payload, which a command substitution would strip
__rhx_dispatch_payload=$(cat; printf .)
__rhx_dispatch_payload="${__rhx_dispatch_payload%.}"

# the exit code of a refusal: 2 holds the event, as a guard that cannot load must. two events
#   take 1 (shown, never held), since a hold there cannot be cleared from the seat it holds:
#   - UserPromptSubmit: a hold erases the human's prompt, on every prompt, until a re-sync
#   - Stop, once claude says a stop hook already held it (`stop_hook_active`): a second hold
#     would loop the seat, so the first stop is held and names the fix, the next one passes
__rhx_dispatch_refuse=2
[[ "$__rhx_dispatch_event" == UserPromptSubmit ]] && __rhx_dispatch_refuse=1
if [[ "$__rhx_dispatch_event" == Stop ]]; then
  __rhx_dispatch_re='"stop_hook_active"[[:space:]]*:[[:space:]]*true'
  [[ "$__rhx_dispatch_payload" =~ $__rhx_dispatch_re ]] && __rhx_dispatch_refuse=1
fi

# a rule reads the same fact from RHACHET_HOOKS_STOP_HELD=1, so a hold that cannot clear from the
#   seat it holds (a fault the brain cannot cure) may hold the first stop and let the next pass
#   with no read of the payload. the payload alone sets it: a value the caller's env carries in
#   is dropped first, so a first stop is never read as held
unset RHACHET_HOOKS_STOP_HELD
[[ "$__rhx_dispatch_event" == Stop && "$__rhx_dispatch_refuse" == 1 ]] && export RHACHET_HOOKS_STOP_HELD=1

# fail closed when the manifest is absent: a guard that cannot load must never allow
if [[ -z "$__rhx_dispatch_manifest" || ! -f "$__rhx_dispatch_manifest" ]]; then
  printf '%s\n' "✋ ConstraintError: hook dispatch manifest not found" >&2
  printf '%s\n' "   ├─ manifest = ${__rhx_dispatch_manifest:-(none given)}" >&2
  printf '%s\n' "   ├─ event = ${__rhx_dispatch_event:-(none given)}" >&2
  printf '%s\n' "   └─ fix = run \`npx rhx init --hooks\` to rewrite it" >&2
  exit "$__rhx_dispatch_refuse"
fi

# fail closed on a manifest version this file does not read: a row of another shape would
#   misread its fields, and a misread guard is no guard
IFS= read -r __rhx_dispatch_head < "$__rhx_dispatch_manifest"
if [[ "$__rhx_dispatch_head" != '# rhachet hooks.dispatch manifest v1' && "$__rhx_dispatch_head" != '# rhachet hooks.dispatch manifest v1 '* ]]; then
  printf '%s\n' "✋ ConstraintError: hook dispatch manifest version is not one this dispatcher reads" >&2
  printf '%s\n' "   ├─ manifest = ${__rhx_dispatch_manifest}" >&2
  printf '%s\n' "   ├─ header = ${__rhx_dispatch_head}" >&2
  printf '%s\n' "   ├─ reads = v1" >&2
  printf '%s\n' "   └─ fix = run \`npx rhx init --hooks\`, with the rhachet this repo installs, to rewrite it" >&2
  exit "$__rhx_dispatch_refuse"
fi

# the per-call files hold the payload and each rule's output, which can carry a prompt or an
#   inline secret: they are made private (umask 077), and removed on any exit, a kill included.
#   a rule runs under the umask this process was started with, read without a fork
# .note = each name carries the pid and a random part, so a file a SIGKILL left behind, or a pid
#   reused across namespaces, never meets a later call's name. each is still created under
#   noclobber (`set -C`): an entry already at the name, a planted symlink included, fails the
#   create, and the next try takes a fresh name; three failures refuse rather than write through
# .note = a child signaled before its first command runs this process's traps, EXIT included, so
#   the clean-up runs only in this process (BASHPID, bash ≥ 4); else a child would remove the
#   files its siblings still read, and the merge would read each absent output as a refusal
__rhx_dispatch_tmp="${TMPDIR:-/tmp}"
__rhx_dispatch_base=''
trap 'if [[ -n "$__rhx_dispatch_base" && "${BASHPID:-$$}" == "$$" ]]; then rm -f "${__rhx_dispatch_base}"*; fi' EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
set -C
__rhx_dispatch_made=0
for __rhx_dispatch_try in 1 2 3; do
  __rhx_dispatch_name="${__rhx_dispatch_tmp}/rhachet.hooks.dispatch.$$.${RANDOM}${RANDOM}."
  if { umask > "${__rhx_dispatch_name}umask"; } 2> /dev/null; then
    __rhx_dispatch_base="$__rhx_dispatch_name"
    __rhx_dispatch_made=1
    break
  fi
done
if [[ "$__rhx_dispatch_made" == 1 ]]; then
  IFS= read -r __rhx_dispatch_umask < "${__rhx_dispatch_base}umask"
  umask 077
  __rhx_dispatch_made=0
  { printf '%s' "$__rhx_dispatch_payload" > "${__rhx_dispatch_base}in"; } 2> /dev/null && __rhx_dispatch_made=1
fi
if [[ "$__rhx_dispatch_made" != 1 ]]; then
  printf '%s\n' "✋ ConstraintError: hook dispatch cannot create its per-call files" >&2
  printf '%s\n' "   ├─ dir = ${__rhx_dispatch_tmp}" >&2
  printf '%s\n' "   ├─ event = ${__rhx_dispatch_event}" >&2
  printf '%s\n' "   └─ fix = point TMPDIR at a dir this user owns and can write" >&2
  exit "$__rhx_dispatch_refuse"
fi

# the key the event's matcher reads, per claude's hooks reference
# .note = only the events a dispatcher is written for (CLAUDE_EVENT_OF_BRAIN_HOOK_EVENT), plus
#   PermissionRequest, whose decision merge `[t22]` pins; any other event reads no key, so only a
#   `*` rule fits it, as on Stop and UserPromptSubmit
__rhx_dispatch_key=''
case "$__rhx_dispatch_event" in
  PreToolUse | PermissionRequest) __rhx_dispatch_keyname='tool_name' ;;
  SessionStart) __rhx_dispatch_keyname='source' ;;
  *) __rhx_dispatch_keyname='' ;;
esac
if [[ -n "$__rhx_dispatch_keyname" ]]; then
  __rhx_dispatch_re="\"${__rhx_dispatch_keyname}\"[[:space:]]*:[[:space:]]*\"([^\"]*)\""
  [[ "$__rhx_dispatch_payload" =~ $__rhx_dispatch_re ]] && __rhx_dispatch_key="${BASH_REMATCH[1]}"
fi

# a sourced rule needs bash ≥ 5 (BASH_ARGV0); below that, a rule runs as `bash <path>`
# .note = RHACHET_HOOKS_DISPATCH_SOURCE=0 asks for `bash <path>` on any bash: an operator's way
#   out if a rule ever misbehaves when sourced, and the way a test reaches the bash < 5 path
__rhx_dispatch_sourced=0
(( BASH_VERSINFO[0] >= 5 )) && [[ "${RHACHET_HOOKS_DISPATCH_SOURCE:-1}" != 0 ]] && __rhx_dispatch_sourced=1

# RHACHET_HOOKS_DISPATCH_TRACE=<file> appends one line per rule (skipped or run, its exit, its
#   kind) and one line per event (verdict, seconds) to that file: the lever for "why did my guard
#   not fire". it never touches stdout or stderr, so the verdict claude reads is unchanged
__rhx_dispatch_trace="${RHACHET_HOOKS_DISPATCH_TRACE:-}"
__rhx_dispatch_traced=''
__rhx_dispatch_t0="${EPOCHREALTIME:-}"

# select the rules that fit this event and its matcher, in manifest order
__rhx_dispatch_n=0
__rhx_dispatch_skips=0
__rhx_dispatch_err_matcher=''
__rhx_dispatch_us=$'\x1f'
__rhx_dispatch_ln=0
while IFS="$__rhx_dispatch_us" read -r __rhx_dispatch_f_event __rhx_dispatch_f_matcher __rhx_dispatch_f_timeout __rhx_dispatch_f_author __rhx_dispatch_f_kind __rhx_dispatch_f_path __rhx_dispatch_f_frame __rhx_dispatch_f_args __rhx_dispatch_f_command __rhx_dispatch_f_when __rhx_dispatch_f_extra || [[ -n "$__rhx_dispatch_f_event" ]]; do
  # the manifest line number, so a refusal names the row to fix
  __rhx_dispatch_ln=$(( __rhx_dispatch_ln + 1 ))
  [[ -z "$__rhx_dispatch_f_event" || "$__rhx_dispatch_f_event" == \#* ]] && continue

  # fail closed on a merge conflict left in the tracked manifest: both sides' rows would run
  case "$__rhx_dispatch_f_event" in
    '<<<<<<<'* | '|||||||'* | '======='* | '>>>>>>>'*)
      printf '%s\n' "✋ ConstraintError: hook dispatch manifest holds an unresolved merge conflict" >&2
      printf '%s\n' "   ├─ manifest = ${__rhx_dispatch_manifest}" >&2
      printf '%s\n' "   └─ fix = take either side, then run \`npx rhx init --hooks\` to rewrite it from the roles" >&2
      exit "$__rhx_dispatch_refuse"
      ;;
  esac
  [[ "$__rhx_dispatch_f_event" != "$__rhx_dispatch_event" ]] && continue

  # fail closed on a row this file cannot run as written (a truncated row, a row of more fields
  #   than v1 declares, an unknown kind): an empty command would run as `sh -c ''` and allow,
  #   and a long row would misread its fields, so a misread guard is never run
  __rhx_dispatch_why='it has no command (a truncated row)'
  case "$__rhx_dispatch_f_kind" in
    rhx-skill | rhx-init | shell | exec | foreign) ;;
    *)
      __rhx_dispatch_f_command=''
      [[ -n "$__rhx_dispatch_f_kind" ]] && __rhx_dispatch_why='its kind is unknown'
      ;;
  esac
  [[ -n "$__rhx_dispatch_f_extra" ]] && __rhx_dispatch_f_command='' __rhx_dispatch_why='it holds more fields than v1 declares'
  if [[ -z "$__rhx_dispatch_f_command" ]]; then
    printf '%s\n' "✋ ConstraintError: hook dispatch manifest row is malformed" >&2
    printf '%s\n' "   ├─ manifest = ${__rhx_dispatch_manifest}" >&2
    printf '%s\n' "   ├─ line = ${__rhx_dispatch_ln}" >&2
    printf '%s\n' "   ├─ why = ${__rhx_dispatch_why}" >&2
    printf '%s\n' "   ├─ event = ${__rhx_dispatch_f_event}" >&2
    printf '%s\n' "   ├─ kind = ${__rhx_dispatch_f_kind:-(none)}" >&2
    printf '%s\n' "   └─ fix = run \`npx rhx init --hooks\` to rewrite it" >&2
    exit "$__rhx_dispatch_refuse"
  fi

  # match by claude's matcher grammar: `*` or empty = all; letters, digits, `_`, `|`, `,` = an exact list; else an unanchored regex
  __rhx_dispatch_mk=regex
  [[ -z "$__rhx_dispatch_f_matcher" || "$__rhx_dispatch_f_matcher" == '*' || -z "$__rhx_dispatch_keyname" ]] && __rhx_dispatch_mk=all
  [[ "$__rhx_dispatch_mk" == regex && "$__rhx_dispatch_f_matcher" =~ ^[A-Za-z0-9_|,]+$ ]] && __rhx_dispatch_mk=list
  __rhx_dispatch_fit=0
  case "$__rhx_dispatch_mk" in
    all) __rhx_dispatch_fit=1 ;;
    list)
      case "|${__rhx_dispatch_f_matcher//,/|}|" in
        *"|${__rhx_dispatch_key}|"*) __rhx_dispatch_fit=1 ;;
      esac
      ;;
    regex)
      # a regex bash cannot parse returns 2: the rule cannot be matched, so it is named, never skipped quietly
      [[ "$__rhx_dispatch_key" =~ $__rhx_dispatch_f_matcher ]]
      __rhx_dispatch_rs=$?
      (( __rhx_dispatch_rs == 0 )) && __rhx_dispatch_fit=1
      # the rule is named as the timeout notice names it: its path, else its command in backticks
      __rhx_dispatch_f_nm="${__rhx_dispatch_f_path}"
      [[ -n "$__rhx_dispatch_f_nm" ]] || __rhx_dispatch_f_nm="\`${__rhx_dispatch_f_command}\`"
      (( __rhx_dispatch_rs == 2 )) && __rhx_dispatch_err_matcher="${__rhx_dispatch_err_matcher}💥 MalfunctionError: hook rule matcher is no valid regex: \`${__rhx_dispatch_f_matcher}\` (${__rhx_dispatch_f_nm})"$'\n'"   └─ fix = run \`npx rhx init --hooks\` to rewrite the manifest from the roles"$'\n'
      ;;
  esac
  if [[ "$__rhx_dispatch_fit" != 1 ]]; then
    [[ -n "$__rhx_dispatch_trace" ]] && __rhx_dispatch_traced="${__rhx_dispatch_traced}hooks.dispatch[$$] ${__rhx_dispatch_event} · skip, matcher ${__rhx_dispatch_f_matcher} does not fit ${__rhx_dispatch_key:-(no key)} · ${__rhx_dispatch_f_path:-${__rhx_dispatch_f_command}}"$'\n'
    __rhx_dispatch_skips=$((__rhx_dispatch_skips + 1))
    continue
  fi

  __rhx_dispatch_timeout[__rhx_dispatch_n]="$__rhx_dispatch_f_timeout"
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
    # a create that fails (a planted entry, a full disk) runs no rule; the merge reads the absent
    #   output files as a refusal, so the guard is never skipped
    exec < "${__rhx_dispatch_base}in" > "${__rhx_dispatch_base}${__rhx_dispatch_i}.out" 2> "${__rhx_dispatch_base}${__rhx_dispatch_i}.err" || exit 2

    # the output files are private; the rule itself runs under the umask claude gave this process,
    #   with the shell options a fresh bash has (noclobber guarded only the dispatcher's own files)
    umask "$__rhx_dispatch_umask"
    set +C

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
    # stopped by USR1, a signal this process does not trap: a USR1 that lands before this line
    #   ends the watchdog by default, where a TERM would run this process's TERM and EXIT traps
    __rhx_dispatch_sleep=''
    trap 'if [[ -n "$__rhx_dispatch_sleep" ]]; then kill "$__rhx_dispatch_sleep" 2>/dev/null; fi; exit 0' USR1
    __rhx_dispatch_elapsed=0
    __rhx_dispatch_grace=2
    while :; do
      # the next deadline among the rules still alive: its timeout, or, once sent TERM, its grace
      __rhx_dispatch_next=''
      __rhx_dispatch_j=0
      while (( __rhx_dispatch_j < __rhx_dispatch_n )); do
        __rhx_dispatch_t="${__rhx_dispatch_timeout[__rhx_dispatch_j]}"
        [[ -n "${__rhx_dispatch_killat[__rhx_dispatch_j]:-}" ]] && __rhx_dispatch_t="${__rhx_dispatch_killat[__rhx_dispatch_j]}"
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

      # past its timeout, a rule is sent TERM; past its grace too, KILL, since a TERM trap waits on
      #   the rule's foreground child and would hold every verdict past claude's own timeout
      # .note = each kill targets the one pid this dispatcher forked; a child the rule left runs
      #   on, as a child of a timed-out hook did under claude (rule.forbid.unscoped-process-kills)
      __rhx_dispatch_j=0
      while (( __rhx_dispatch_j < __rhx_dispatch_n )); do
        __rhx_dispatch_kp="${__rhx_dispatch_pid[__rhx_dispatch_j]}"
        __rhx_dispatch_ka="${__rhx_dispatch_killat[__rhx_dispatch_j]:-}"
        if kill -0 "$__rhx_dispatch_kp" 2>/dev/null; then
          [[ -n "$__rhx_dispatch_ka" ]] && (( __rhx_dispatch_ka <= __rhx_dispatch_elapsed )) && kill -KILL "$__rhx_dispatch_kp" 2>/dev/null
          if [[ -z "$__rhx_dispatch_ka" ]] && (( __rhx_dispatch_timeout[__rhx_dispatch_j] <= __rhx_dispatch_elapsed )); then
            { : > "${__rhx_dispatch_base}${__rhx_dispatch_j}.timeout"; } 2> /dev/null
            kill -TERM "$__rhx_dispatch_kp" 2>/dev/null
            __rhx_dispatch_killat[__rhx_dispatch_j]=$((__rhx_dispatch_elapsed + __rhx_dispatch_grace))
          fi
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
  # .note = bash reports a job a signal ended (`line N: <pid> Killed  ( <the subshell source> )`)
  #   on the stderr of the `wait` that reaps it; the timeout line below names the rule instead
  wait "${__rhx_dispatch_pid[__rhx_dispatch_i]}" 2> /dev/null
  __rhx_dispatch_code[__rhx_dispatch_i]=$?
  # a rule the watchdog sent TERM counts as timed out, whatever code it then exits with: a rule's
  #   own EXIT trap can turn the TERM into an exit 2, and claude reads a timed-out hook as a
  #   non-block whatever it exits. a rule that exits 0 keeps its verdict
  # .note = the marker is written only for a rule `kill -0` finds alive at its deadline; this
  #   process reaps each child as its SIGCHLD lands, so a rule that ended before its deadline is
  #   gone by then, and its own verdict stands
  [[ -f "${__rhx_dispatch_base}${__rhx_dispatch_i}.timeout" ]] && (( __rhx_dispatch_code[__rhx_dispatch_i] != 0 )) && __rhx_dispatch_code[__rhx_dispatch_i]=124
  __rhx_dispatch_i=$((__rhx_dispatch_i + 1))
done
if [[ -n "$__rhx_dispatch_wd" ]]; then
  kill -USR1 "$__rhx_dispatch_wd" 2>/dev/null
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
__rhx_dispatch_json_rk=0
__rhx_dispatch_re_decision='"(permissionDecision|decision)"[[:space:]]*:[[:space:]]*"(deny|block|ask|allow|approve)"'
# a PermissionRequest decision is an object: `"decision":{"behavior":"allow"}`
__rhx_dispatch_re_behavior='"behavior"[[:space:]]*:[[:space:]]*"(deny|ask|allow)"'
__rhx_dispatch_stdout=''
__rhx_dispatch_err_block=''
__rhx_dispatch_by_block=''
__rhx_dispatch_err_crash=''
__rhx_dispatch_i=0
while (( __rhx_dispatch_i < __rhx_dispatch_n )); do
  __rhx_dispatch_o=''
  __rhx_dispatch_e=''
  __rhx_dispatch_c="${__rhx_dispatch_code[__rhx_dispatch_i]}"
  __rhx_dispatch_fr="${__rhx_dispatch_frame[__rhx_dispatch_i]}"

  # the rule as a notice names it: its file, else its command in backticks, so `exit 3` reads as
  #   the rule and never as a second exit code
  __rhx_dispatch_nm="${__rhx_dispatch_path[__rhx_dispatch_i]}"
  [[ -n "$__rhx_dispatch_nm" ]] || __rhx_dispatch_nm="\`${__rhx_dispatch_command[__rhx_dispatch_i]}\`"

  # a rule whose output files could not be created never ran: it reads as a refusal, never an allow
  if [[ -f "${__rhx_dispatch_base}${__rhx_dispatch_i}.out" && -f "${__rhx_dispatch_base}${__rhx_dispatch_i}.err" ]]; then
    IFS= read -r -d '' __rhx_dispatch_o < "${__rhx_dispatch_base}${__rhx_dispatch_i}.out"
    IFS= read -r -d '' __rhx_dispatch_e < "${__rhx_dispatch_base}${__rhx_dispatch_i}.err"
  else
    __rhx_dispatch_c=2
    __rhx_dispatch_fr=''
    __rhx_dispatch_e="✋ ConstraintError: hook dispatch cannot create the per-call files of a rule (${__rhx_dispatch_nm}); point TMPDIR at a dir this user owns and can write"$'\n'
  fi

  # a timeout names itself, so the human sees which rule hung
  if (( __rhx_dispatch_c == 124 )) && [[ -f "${__rhx_dispatch_base}${__rhx_dispatch_i}.timeout" ]]; then
    __rhx_dispatch_e="${__rhx_dispatch_e}💥 MalfunctionError: hook rule timed out after ${__rhx_dispatch_timeout[__rhx_dispatch_i]}s (${__rhx_dispatch_nm})"$'\n'"   └─ fix = find why the rule hangs, or raise the timeout its role declares"$'\n'
  fi

  # a crash that wrote no stderr names its rule: claude labels the dispatcher, not the rule, so a
  #   silent crash would read as a blank line from no one (an rhx rule's frame already names it)
  if (( __rhx_dispatch_c != 0 && __rhx_dispatch_c != 2 )) && [[ -z "$__rhx_dispatch_fr" && -z "${__rhx_dispatch_e//[[:space:]]/}" ]]; then
    __rhx_dispatch_e="💥 MalfunctionError: hook rule exited ${__rhx_dispatch_c} with no stderr (${__rhx_dispatch_nm})"$'\n'"   └─ fix = run the rule alone with this event's payload on stdin, to see why it exits ${__rhx_dispatch_c}"$'\n'
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

  [[ -n "$__rhx_dispatch_trace" ]] && __rhx_dispatch_traced="${__rhx_dispatch_traced}hooks.dispatch[$$] ${__rhx_dispatch_event} · ran ${__rhx_dispatch_kind[__rhx_dispatch_i]}, exit ${__rhx_dispatch_c} · ${__rhx_dispatch_path[__rhx_dispatch_i]:-${__rhx_dispatch_command[__rhx_dispatch_i]}}"$'\n'

  # tally the verdict, and route the bytes by it
  if (( __rhx_dispatch_c == 2 )); then
    __rhx_dispatch_blocked=1
    __rhx_dispatch_err_block="${__rhx_dispatch_err_block}${__rhx_dispatch_e}"
    __rhx_dispatch_by_block="${__rhx_dispatch_by_block}🪝 hooks.dispatch ${__rhx_dispatch_event} blocked by ${__rhx_dispatch_path[__rhx_dispatch_i]:-${__rhx_dispatch_command[__rhx_dispatch_i]}}"$'\n'
  fi
  if (( __rhx_dispatch_c != 0 && __rhx_dispatch_c != 2 )); then
    (( __rhx_dispatch_crashed == 0 )) && __rhx_dispatch_crashed="$__rhx_dispatch_c"
    __rhx_dispatch_err_crash="${__rhx_dispatch_err_crash}${__rhx_dispatch_e}"
  fi
  if (( __rhx_dispatch_c == 0 )); then
    # a json decision is the whole of its rule's stdout. claude ranks the decisions of separate
    #   hooks deny > ask > allow, so the strongest is kept whole; of equal rank, the first
    __rhx_dispatch_t="${__rhx_dispatch_o#"${__rhx_dispatch_o%%[![:space:]]*}"}"
    if [[ "$__rhx_dispatch_t" == \{* ]]; then
      __rhx_dispatch_dc=''
      [[ "$__rhx_dispatch_o" =~ $__rhx_dispatch_re_decision ]] && __rhx_dispatch_dc="${BASH_REMATCH[2]}"
      [[ -z "$__rhx_dispatch_dc" && "$__rhx_dispatch_o" =~ $__rhx_dispatch_re_behavior ]] && __rhx_dispatch_dc="${BASH_REMATCH[1]}"
      __rhx_dispatch_rk=0
      case "$__rhx_dispatch_dc" in
        allow | approve) __rhx_dispatch_rk=1 ;;
        ask) __rhx_dispatch_rk=2 ;;
        deny | block) __rhx_dispatch_rk=3 ;;
      esac
      if [[ -z "$__rhx_dispatch_json" ]] || (( __rhx_dispatch_rk > __rhx_dispatch_json_rk )); then
        __rhx_dispatch_json="$__rhx_dispatch_o"
        __rhx_dispatch_json_rk="$__rhx_dispatch_rk"
      fi
    fi
    __rhx_dispatch_stdout="${__rhx_dispatch_stdout}${__rhx_dispatch_o}"
  fi
  __rhx_dispatch_i=$((__rhx_dispatch_i + 1))
done

# a matcher that is no valid regex ran no rule; it reports as a crash, so the gap is never silent
if [[ -n "$__rhx_dispatch_err_matcher" ]]; then
  __rhx_dispatch_err_crash="${__rhx_dispatch_err_crash}${__rhx_dispatch_err_matcher}"
  (( __rhx_dispatch_crashed == 0 )) && __rhx_dispatch_crashed=1
fi

# .what = a string as a json string literal, into __rhx_dispatch_js (a function, so no subshell fork)
__rhx_dispatch_as_json_string() {
  __rhx_dispatch_js="${1//\\/\\\\}"
  __rhx_dispatch_js="${__rhx_dispatch_js//\"/\\\"}"
  __rhx_dispatch_js="${__rhx_dispatch_js//$'\n'/\\n}"
  __rhx_dispatch_js="${__rhx_dispatch_js//$'\r'/\\r}"
  __rhx_dispatch_js="${__rhx_dispatch_js//$'\t'/\\t}"
  __rhx_dispatch_js="${__rhx_dispatch_js//$'\e'/\\u001b}"
  # json forbids every other raw control byte too; a rare text, so the scan runs only on a hit
  # .note = printf -v is a builtin, so the loop forks no process; bash strings hold no NUL
  if [[ "$__rhx_dispatch_js" == *[$'\001'-$'\037']* ]]; then
    for __rhx_dispatch_cc in 001 002 003 004 005 006 007 010 013 014 016 017 020 021 022 023 024 025 026 027 030 031 032 034 035 036 037; do
      printf -v __rhx_dispatch_cb "\\$__rhx_dispatch_cc"
      printf -v __rhx_dispatch_cu '\\u%04x' $(( 8#$__rhx_dispatch_cc ))
      __rhx_dispatch_js="${__rhx_dispatch_js//"$__rhx_dispatch_cb"/$__rhx_dispatch_cu}"
    done
  fi
  __rhx_dispatch_js="\"${__rhx_dispatch_js}\""
}

# .what = append the trace lines, then this event's verdict line, to the trace file, if one is set
# .note = a trace file that cannot be written is skipped: the trace is a lens, never a guard
__rhx_dispatch_trace_flush() {
  [[ -z "$__rhx_dispatch_trace" ]] && return 0
  __rhx_dispatch_secs=''
  if [[ -n "$__rhx_dispatch_t0" && -n "${EPOCHREALTIME:-}" ]]; then
    __rhx_dispatch_us0="${__rhx_dispatch_t0//[.,]/}"
    __rhx_dispatch_us1="${EPOCHREALTIME//[.,]/}"
    __rhx_dispatch_usd=$(( 10#$__rhx_dispatch_us1 - 10#$__rhx_dispatch_us0 ))
    printf -v __rhx_dispatch_secs ', %d.%03ds' $(( __rhx_dispatch_usd / 1000000 )) $(( (__rhx_dispatch_usd / 1000) % 1000 ))
  fi
  __rhx_dispatch_sk=''
  (( __rhx_dispatch_skips > 0 )) && __rhx_dispatch_sk=", ${__rhx_dispatch_skips} skipped"
  { printf '%s' "$__rhx_dispatch_traced" "hooks.dispatch[$$] ${__rhx_dispatch_event} · ${__rhx_dispatch_n} ran${__rhx_dispatch_sk} · exit $1${__rhx_dispatch_secs}"$'\n' >> "$__rhx_dispatch_trace"; } 2> /dev/null
  return 0
}

# a block wins: every blocker's stderr, in manifest order; a crash beside it follows, so a guard
# that did not finish is never hidden behind another rule's block
# .note = claude's label names the dispatcher, not the rule, so a tail line names each blocker's
#   file; a refusal whose own text names no rule (e.g. "this command is not paved") stays traceable
#   on a live seat, with no trace flag and no replay. each rule's own bytes above it are unchanged
if (( __rhx_dispatch_blocked == 1 )); then
  printf '%s' "$__rhx_dispatch_err_block" >&2
  [[ -n "$__rhx_dispatch_err_crash" ]] && printf '%s' "$__rhx_dispatch_err_crash" >&2
  printf '%s' "$__rhx_dispatch_by_block" >&2
  __rhx_dispatch_trace_flush 2
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
  __rhx_dispatch_trace_flush "$__rhx_dispatch_crashed"
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
__rhx_dispatch_trace_flush 0
if [[ -n "$__rhx_dispatch_json" ]]; then
  printf '%s' "$__rhx_dispatch_json"
  exit 0
fi
printf '%s' "$__rhx_dispatch_stdout"
exit 0
