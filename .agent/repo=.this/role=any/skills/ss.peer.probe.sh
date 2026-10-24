#!/usr/bin/env bash
######################################################################
# .what = probe what `ss -xp` reports for a live unix socket pair
#
# .why  = the clone socket's same-user auth reads the peer pid from
#         `ss -xp`. when it refuses with "could not read peer pid from
#         ss", this prints the ss version, the call's wall time, and the
#         raw lines that carry the pair's inodes — the measured cause
#
# usage:
#   rhx ss.peer.probe
#   rhx ss.peer.probe --busy 32    # read each wall time on a cpu-saturated host
#
# guarantee:
#   - read-only: opens one temp socket pair, removes it after
#   - exit 0 = probe printed, 1 = malfunction
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SKILL_DIR/ss.peer.probe.js" "$@"
