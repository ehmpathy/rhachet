#!/usr/bin/env bash
######################################################################
# .what = portable reproduction: keyrack get fails after set (FIXED)
#
# .problem = keyrack set writes to os.secure vault file, but keyrack get
#            immediately after returns exit 2 (locked) because get uses
#            a lightweight context without the os.secure vault adapter.
#
# .root cause =
#   - keyrack set writes to vault FILE (os.secure)
#   - keyrack get reads from DAEMON cache only (not vault file)
#   - daemon doesn't auto-refresh when vault changes
#   - if unlock was called BEFORE set, daemon has stale/empty state
#
# .fix = call unlock AFTER set to load new key into daemon
#
#   wrong order:  init → unlock → set → get (FAILS)
#   right order:  init → set → unlock → get (WORKS)
#
# .handoff = this demonstrates the correct flow
#
# usage:
#   cd <repo-with-rhachet>
#   bash repro.keyrack-get-after-set.command.sh
######################################################################

set -euo pipefail

echo "=== keyrack get-after-set reproduction ==="
echo ""

# create isolated HOME
TEMP_HOME=$(mktemp -d)
trap 'rm -rf "$TEMP_HOME"' EXIT
echo "temp HOME: $TEMP_HOME"

# create passwordless SSH keypair
mkdir -p "$TEMP_HOME/.ssh"
chmod 700 "$TEMP_HOME/.ssh"
ssh-keygen -t ed25519 -f "$TEMP_HOME/.ssh/testkey" -N "" -C "test@repro" >/dev/null 2>&1
echo "ssh key: $TEMP_HOME/.ssh/testkey"

# strip tokens from env to ensure isolation
unset GITHUB_TOKEN 2>/dev/null || true
unset EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN 2>/dev/null || true

export HOME="$TEMP_HOME"

echo ""
echo "=== step 1: keyrack init ==="
./node_modules/.bin/rhachet keyrack init \
  --owner repro \
  --pubkey "$TEMP_HOME/.ssh/testkey.pub"

echo ""
echo "=== step 2: keyrack set (stdin: test-value-123) ==="
echo "test-value-123" | ./node_modules/.bin/rhachet keyrack set \
  --owner repro \
  --prikey "$TEMP_HOME/.ssh/testkey" \
  --key TEST_KEY \
  --env all \
  --vault os.secure

echo ""
echo "=== step 3: verify file was written ==="
echo "tree of $TEMP_HOME/.rhachet:"
find "$TEMP_HOME/.rhachet" -type f 2>/dev/null | head -20 || echo "(no files)"

echo ""
echo "=== step 4: keyrack unlock (after set) ==="
./node_modules/.bin/rhachet keyrack unlock \
  --owner repro \
  --prikey "$TEMP_HOME/.ssh/testkey" \
  --env all

echo ""
echo "=== step 5: keyrack get (should return test-value-123) ==="
echo ""
echo "cmd: keyrack get --owner repro --key TEST_KEY --env all --allow-dangerous"
echo ""

GET_EXIT=0
GET_OUTPUT=$(./node_modules/.bin/rhachet keyrack get \
  --owner repro \
  --key TEST_KEY \
  --env all \
  --allow-dangerous 2>&1) || GET_EXIT=$?

echo "stdout: $GET_OUTPUT"
echo "exit code: $GET_EXIT"

echo ""
if [[ $GET_EXIT -eq 0 ]]; then
  echo "=== PASS: get succeeded ==="
else
  echo "=== FAIL: get returned exit $GET_EXIT ==="
  echo ""
  echo "this demonstrates the bug:"
  echo "  - keyrack set succeeded (file was written)"
  echo "  - keyrack get failed with exit 2 (locked)"
  echo ""
  echo "root cause: keyrack get uses lightweight context without os.secure vault adapter"
  echo "resolution order in get: envvar → daemon → locked (os.secure never checked)"
fi

echo ""
echo "=== end reproduction ==="
