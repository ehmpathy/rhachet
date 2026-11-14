#!/usr/bin/env bash
######################################################################
# .what = compare the host node version with the repo's .nvmrc pin
#
# .why  = ci runs node at the .nvmrc pin; a host on another version
#         can drift a real-node snapshot (e.g. the esm namespace keys
#         a require(esm) or import(cjs) exposes). this names the drift
#         before a snapshot diff is blamed on the change under test
#
# usage:
#   rhx node.version.check
#
# guarantee:
#   - prints the host version and the pinned version
#   - exit 0 = they match
#   - exit 2 = they differ (switch the host: fnm use / nvm use)
######################################################################

set -euo pipefail

# the dispatcher's own flags arrive in argv; any other token is refused by name
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo|--role|--skill)
      shift 2
      ;;
    *)
      echo "node.version.check: unknown arg: $1" >&2
      echo "usage: node.version.check" >&2
      exit 2
      ;;
  esac
done

# read both versions
GITROOT="$(git rev-parse --show-toplevel)"
VERSION_HOST="$(node --version)"
VERSION_PIN="$(tr -d '[:space:]' < "$GITROOT/.nvmrc")"

# report
echo "🧮 node.version.check"
echo "   ├─ host = $VERSION_HOST"
echo "   └─ pin  = $VERSION_PIN (.nvmrc)"

# a mismatch is caller-fixable: switch the host node
if [[ "$VERSION_HOST" != "$VERSION_PIN" ]]; then
  echo "" >&2
  echo "✋ ConstraintError: host node differs from the .nvmrc pin" >&2
  echo "   └─ fix: fnm use (or nvm use), then rerun the real-node suite" >&2
  exit 2
fi
