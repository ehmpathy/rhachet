#!/usr/bin/env bash
######################################################################
# .what = count the stubBrainCli.cjs processes alive on this box
#
# .why  = a stub whose parent dies used to park forever; one suite left
#         310 alive. a test run is clean only if it leaves zero, so this
#         is the read-back after every run that spawns the stub
#
# usage:
#   rhx test.stubs.count
#
# guarantee:
#   - read only: it reads /proc/*/cmdline, never signals a process
#   - exit 0 = zero stubs; exit 2 = one or more left (each pid named)
######################################################################
set -euo pipefail

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill|--repo|--role) shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

# scan every live process cmdline; a process may exit mid-scan, so a read miss is skipped
PIDS=()
for CMDLINE in /proc/[0-9]*/cmdline; do
  ARGS="$( { tr '\0' ' ' < "$CMDLINE"; } 2>/dev/null || true)"
  [[ "$ARGS" == *stubBrainCli.cjs* ]] || continue
  PID="${CMDLINE#/proc/}"
  PIDS+=("${PID%/cmdline}")
done

# age (minutes) and parent pid, from /proc/<pid>/stat: field 4 = ppid, field 22 = start ticks.
#   the comm field may hold spaces, so fields are counted past its close paren
TICKS="$(getconf CLK_TCK)"
UPTIME_S="$(cut -d' ' -f1 /proc/uptime)"
describe_pid() {
  local STAT REST PPID_OF START_TICKS AGE_MIN
  STAT="$( { cat "/proc/$1/stat"; } 2>/dev/null || true)"
  [[ -n "$STAT" ]] || { echo "$1 (gone)"; return; }
  REST="${STAT##*) }"
  PPID_OF="$(echo "$REST" | cut -d' ' -f2)"
  START_TICKS="$(echo "$REST" | cut -d' ' -f20)"
  AGE_MIN="$(awk -v up="$UPTIME_S" -v st="$START_TICKS" -v hz="$TICKS" 'BEGIN { printf "%d", (up - st / hz) / 60 }')"
  PARENT_ARGS="$( { tr '\0' ' ' < "/proc/$PPID_OF/cmdline"; } 2>/dev/null || true)"
  CWD_OF="$( { readlink "/proc/$1/cwd"; } 2>/dev/null || true)"
  echo "$1 (age ${AGE_MIN}m, ppid ${PPID_OF}) ← ${PARENT_ARGS: -140}"
  echo "      │     cwd ${CWD_OF}"
}

echo "🧮 test.stubs.count"
if [[ ${#PIDS[@]} -eq 0 ]]; then
  echo "   └─ 0 stubBrainCli.cjs processes alive"
  exit 0
fi
echo "   ├─ ${#PIDS[@]} stubBrainCli.cjs processes alive"
echo "   └─ pids"
LAST=$(( ${#PIDS[@]} - 1 ))
for I in "${!PIDS[@]}"; do
  BRANCH="├─"
  [[ $I -eq $LAST ]] && BRANCH="└─"
  echo "      $BRANCH $(describe_pid "${PIDS[$I]}")"
done
exit 2
