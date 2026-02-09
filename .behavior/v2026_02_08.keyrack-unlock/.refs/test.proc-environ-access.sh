#!/usr/bin/env bash
######################################################################
# .what = test whether same-user processes can read /proc/$PID/environ
# .why  = empirically verify the /proc environ access claims
#         in eval.per-terminal-chain-structural-advantage.md
#
# tests:
#   1. can a same-user, non-child process read /proc/$PID/environ?
#   2. does ptrace_scope=1 (ubuntu/debian default) block this?
#   3. can the secret env var value be extracted?
######################################################################
set -euo pipefail

echo "=== /proc/\$PID/environ access test ==="
echo ""

# system info
echo "kernel: $(uname -r)"
echo "distro: $(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 | tr -d '"')"
echo "ptrace_scope: $(cat /proc/sys/kernel/yama/ptrace_scope)"
echo "current user: $(whoami)"
echo "current pid: $$"
echo ""

# spawn a background process with a secret env var
export KEYRACK_TEST_SECRET="s3cr3t_hunter2_d0ntl34k"
sleep 300 &
TARGET_PID=$!
echo "target pid: $TARGET_PID"
echo "target owner: $(stat -c '%U' /proc/$TARGET_PID/environ 2>/dev/null || echo 'unknown')"
echo "target permissions: $(ls -la /proc/$TARGET_PID/environ 2>/dev/null || echo 'unknown')"
echo ""

# test 1: can we read the file at all?
echo "--- test 1: read /proc/$TARGET_PID/environ ---"
if cat /proc/$TARGET_PID/environ > /dev/null 2>&1; then
  echo "result: READABLE (exit 0)"
else
  echo "result: DENIED (exit $?)"
fi
echo ""

# test 2: can we extract the secret?
echo "--- test 2: extract KEYRACK_TEST_SECRET from /proc/$TARGET_PID/environ ---"
EXTRACTED=$(cat /proc/$TARGET_PID/environ 2>/dev/null | tr '\0' '\n' | grep KEYRACK_TEST_SECRET || true)
if [[ -n "$EXTRACTED" ]]; then
  echo "result: SECRET EXTRACTED"
  echo "value: $EXTRACTED"
else
  echo "result: SECRET NOT FOUND (either denied or not present)"
fi
echo ""

# test 3: enumerate all processes and find the secret
echo "--- test 3: enumerate /proc/*/environ for KEYRACK_TEST_SECRET ---"
FOUND_COUNT=0
for pid_dir in /proc/[0-9]*/environ; do
  pid=$(echo "$pid_dir" | grep -oP '/proc/\K[0-9]+')
  result=$(cat "$pid_dir" 2>/dev/null | tr '\0' '\n' | grep KEYRACK_TEST_SECRET 2>/dev/null || true)
  if [[ -n "$result" ]]; then
    FOUND_COUNT=$((FOUND_COUNT + 1))
    echo "  found in pid=$pid: $result"
  fi
done
echo "total processes with secret: $FOUND_COUNT"
echo ""

# cleanup
kill $TARGET_PID 2>/dev/null || true

echo "=== done ==="
