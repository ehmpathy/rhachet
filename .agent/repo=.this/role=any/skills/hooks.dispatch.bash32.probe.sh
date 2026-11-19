#!/usr/bin/env bash
######################################################################
# .what = run bin/hooks.dispatch.sh under a real bash 3.2 (the macos
#         system bash) and under the host bash, and compare each verdict
#
# .why  = a seat on macos may run the dispatcher with /bin/bash 3.2.
#         the bash < 5 branch is exercised on a linux bash; this reads
#         it on a real 3.2, in the official `bash:3.2` image
#
# usage:
#   rhx hooks.dispatch.bash32.probe
#   rhx hooks.dispatch.bash32.probe --image bash:3.2
#
# guarantee:
#   - each case runs one payload through one fixture manifest on both bashes
#   - prints exit per bash, and whether stdout and stderr agree
#   - writes only to a temp dir it removes
#   - exit 0 = every case agrees, 1 = a case differs, 2 = bad input or no docker
######################################################################
set -euo pipefail

IMAGE="bash:3.2"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --image) IMAGE="$2"; shift 2 ;;
    --help|-h) awk 'NR > 2 && /^#/ { sub(/^# ?/, ""); print } /^set -euo/ { exit }' "${BASH_SOURCE[0]}" | grep -v '^#*$' || :; exit 0 ;;
    --repo|--role|--skill) shift 2 ;;
    *) echo "✋ ConstraintError: unknown flag $1" >&2; echo "   └─ hint: rhx hooks.dispatch.bash32.probe --help" >&2; exit 2 ;;
  esac
done

command -v docker > /dev/null || { echo "✋ ConstraintError: docker is required" >&2; echo "   └─ hint: install docker, or run on a macos box with /bin/bash 3.2" >&2; exit 2; }

REPO=$(git rev-parse --show-toplevel)
DIR=$(mktemp -d)
trap 'rm -rf "$DIR"' EXIT
mkdir -p "$DIR/rules"

# the fixture rules: a shell file rule that blocks, one that asks via json, a foreign rule that
#   allows, and one that hangs past its timeout
printf '%s\n' 'cat > /dev/null; echo "nope from block.sh" >&2; exit 2' > "$DIR/rules/block.sh"
printf '%s\n' 'cat > /dev/null; echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"ask\"}}"' > "$DIR/rules/ask.sh"
US=$'\x1f'
row() { local IFS="$US"; echo "$*"; }
manifest() {
  echo '# rhachet hooks.dispatch manifest v1'
  local r
  for r in "$@"; do echo "$r"; done
}
ALLOW=$(row PreToolUse Bash 5 repo=test/role=tester foreign '' '' '' 'echo allowed' '')
BLOCK=$(row PreToolUse Bash 5 repo=test/role=tester shell rules/block.sh '' '' 'bash rules/block.sh' '')
ASK=$(row PreToolUse Bash 5 repo=test/role=tester shell rules/ask.sh '' '' 'bash rules/ask.sh' '')
HANG=$(row PreToolUse Bash 1 repo=test/role=tester foreign '' '' '' 'sleep 8' '')
manifest "$ALLOW" > "$DIR/allow.manifest"
manifest "$ALLOW" "$BLOCK" > "$DIR/block.manifest"
manifest "$ALLOW" "$ASK" > "$DIR/ask.manifest"
manifest "$HANG" > "$DIR/hang.manifest"
cp "$REPO/bin/hooks.dispatch.sh" "$DIR/hooks.dispatch.sh"
PAYLOAD='{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"pwd"}}'

# run one case on one bash: the host's, or the image's
run_host() {
  local code=0
  (cd "$DIR" && printf '%s' "$PAYLOAD" | bash ./hooks.dispatch.sh "$1" PreToolUse > "$DIR/out.host" 2> "$DIR/err.host") || code=$?
  echo "$code"
}
run_b32() {
  local code=0
  printf '%s' "$PAYLOAD" | docker run --rm -i -v "$DIR:/w" -w /w "$IMAGE" bash ./hooks.dispatch.sh "$1" PreToolUse > "$DIR/out.b32" 2> "$DIR/err.b32" || code=$?
  echo "$code"
}

VERSION=$(docker run --rm "$IMAGE" bash -c 'echo $BASH_VERSION')
echo "heres the read..."
echo ""
echo "🧮 hooks.dispatch.bash32.probe --image $IMAGE"
echo "   ├─ bash in image = $VERSION"
echo "   ├─ bash on host = $BASH_VERSION"
differs=0
cases=(allow block ask hang)
last=$(( ${#cases[@]} - 1 ))
for i in "${!cases[@]}"; do
  c="${cases[$i]}"
  code_host=$(run_host "$c.manifest")
  code_b32=$(run_b32 "$c.manifest")
  same="yes"
  { [[ "$code_host" == "$code_b32" ]] && cmp -s "$DIR/out.host" "$DIR/out.b32" && cmp -s "$DIR/err.host" "$DIR/err.b32"; } || { same="no"; differs=1; }
  glyph="├─"; bar="│"
  [[ "$i" == "$last" ]] && glyph="└─" && bar=" "
  echo "   $glyph $c"
  echo "   $bar  ├─ exit host = $code_host, exit 3.2 = $code_b32"
  echo "   $bar  └─ stdout and stderr byte-equal = $same"
  if [[ "$same" == "no" ]]; then
    { echo "--- $c host stdout, stderr"; cat "$DIR/out.host" "$DIR/err.host"; echo "--- $c 3.2 stdout, stderr"; cat "$DIR/out.b32" "$DIR/err.b32"; } >&2
  fi
done
exit "$differs"
