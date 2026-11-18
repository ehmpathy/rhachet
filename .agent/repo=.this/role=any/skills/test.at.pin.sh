#!/usr/bin/env bash
######################################################################
# .what = run git.repo.test under the node version .nvmrc pins
#
# .why  = ci runs every tier at the .nvmrc pin. a host on another node
#         can fail a suite ci passes (a real-node snapshot key, a unix
#         socket path node 24 refuses where node 22 accepts it). this
#         runs the suite as ci does, so a host drift is told apart from
#         a defect in the change under test (rhx node.version.check
#         names the drift)
#
# usage:
#   rhx test.at.pin --what acceptance --against local --env test --scope 'path://keyrack.get' --mode apply
#
# guarantee:
#   - passes every arg to `rhx git.repo.test`, and only to it
#   - runs it via `fnm exec --using <pin>`
#   - fails fast where fnm or the pinned node is absent, with the fix
######################################################################

set -euo pipefail

# the dispatcher's own flags arrive in argv; all else is git.repo.test's
ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo|--role|--skill)
      shift 2
      ;;
    *)
      # forwarded: to `rhx git.repo.test`, which refuses an unknown flag by name
      ARGS+=("$1")
      shift
      ;;
  esac
done

# read the pin
GITROOT="$(git rev-parse --show-toplevel)"
VERSION_PIN="$(tr -d '[:space:]' < "$GITROOT/.nvmrc")"

# fnm must be on the path
if ! command -v fnm > /dev/null; then
  echo "✋ ConstraintError: fnm is required to run at the pin" >&2
  echo "   └─ fix: install fnm (https://github.com/Schniz/fnm), then fnm install $VERSION_PIN" >&2
  exit 2
fi

# the pinned node must be installed
if ! fnm exec --using "$VERSION_PIN" -- node --version > /dev/null; then
  echo "✋ ConstraintError: node $VERSION_PIN is not installed" >&2
  echo "   └─ fix: fnm install $VERSION_PIN" >&2
  exit 2
fi

# run the suite at the pin
echo "🧮 test.at.pin"
echo "   └─ node = $VERSION_PIN (.nvmrc)"
echo ""
exec fnm exec --using "$VERSION_PIN" -- npx rhx git.repo.test "${ARGS[@]}"
