#!/usr/bin/env bash
######################################################################
# .what = run gated live-brain acceptance suites, scoped, on demand
#
# .why  = a live-brain suite is skipped unless BRAIN_LIVE_SCOPE=all
#         (describeBrainLiveOnDemand), and an env-prefixed command is
#         no paved call. this is the one paved way to run such a suite,
#         so a driver who must prove a real-brain claim never improvises
#
# usage:
#   rhx test.acceptance.brainlive --scope 'path://roles.mods.realbrain'
#   rhx test.acceptance.brainlive --scope 'path://brain-dir-boot' --resnap
#
# options:
#   --scope    the git.repo.test scope for the suites to run (required)
#   --resnap   write snapshots (default: verify only)
#
# guarantee:
#   - exports BRAIN_LIVE_SCOPE=all, then delegates to
#     `rhx git.repo.test --what acceptance --against local --env test`
#     (which unlocks the keyrack, logs, and summarizes)
#   - a scope is required: a live-brain run spends real money, so it is
#     never a whole-tier sweep (rule.forbid.local-full-test-sweeps)
#   - the exit code of git.repo.test is passed through
######################################################################
set -euo pipefail

SCOPE=""
RESNAP=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --scope) SCOPE="$2"; shift 2 ;;
    --resnap) RESNAP=(--resnap); shift ;;
    --help|-h) awk 'NR > 2 && /^#/ { sub(/^# ?/, ""); print } /^set -euo/ { exit }' "$0" | grep -v '^#*$' || :; exit 0 ;;
    --skill|--repo|--role) shift 2 ;;
    *) echo "✋ ConstraintError: unknown option: $1" >&2; exit 2 ;;
  esac
done
[[ -n "$SCOPE" ]] || { echo "✋ ConstraintError: --scope is required" >&2; exit 2; }

export BRAIN_LIVE_SCOPE=all
exec rhx git.repo.test --what acceptance --against local --env test --scope "$SCOPE" --mode apply "${RESNAP[@]}"