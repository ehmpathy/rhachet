#!/usr/bin/env bash
######################################################################
# .what = record every concern disposition of one peer lane, then absorb the lane
#
# .why  = a lane of N concerns owes N `route.stone.set --as conceded|disputed`
#         calls plus one `--as absorbed`; by hand that is N+1 commands,
#         each easy to mistype. disputes cite the lane's own .taken
#
# usage:
#   absorb.peer.lane.sh --stone 5.1.execution --taken <path-to-.taken> --lane repo-rules \
#     blocker.1=disputed nitpick.2=better blocker.3=urgent
#
#   each disposition is <concern>=<disputed|better|urgent>
#   better|urgent = conceded with that severity; disputed = cites --taken
#
# guarantee:
#   - fail-fast: the first refused call stops the run (exit as it did)
#   - absorbs the lane only after every disposition landed
######################################################################
set -euo pipefail

STONE=""
TAKEN=""
LANE=""
DISPOSITIONS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --stone) STONE="$2"; shift 2 ;;
    --taken) TAKEN="$2"; shift 2 ;;
    --lane) LANE="$2"; shift 2 ;;
    --skill|--repo|--role) shift 2 ;;
    -h|--help) sed -n '3,18p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *=*) DISPOSITIONS+=("$1"); shift ;;
    *) echo "✋ ConstraintError: unknown arg: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$STONE" || -z "$TAKEN" || -z "$LANE" ]]; then
  echo "✋ ConstraintError: --stone, --taken and --lane are required" >&2
  exit 2
fi
if [[ ! -f "$TAKEN" ]]; then
  echo "✋ ConstraintError: no .taken at $TAKEN" >&2
  exit 2
fi

for entry in "${DISPOSITIONS[@]}"; do
  concern="${entry%%=*}"
  verdict="${entry#*=}"
  case "$verdict" in
    disputed)
      npx rhachet run --skill route.stone.set --stone "$STONE" --as disputed \
        --with "$LANE" --about "$concern" --why "$TAKEN" ;;
    better|urgent)
      npx rhachet run --skill route.stone.set --stone "$STONE" --as conceded \
        --with "$LANE" --about "$concern" --severity "$verdict" ;;
    *) echo "✋ ConstraintError: unknown verdict '$verdict' for $concern" >&2; exit 2 ;;
  esac
done

npx rhachet run --skill route.stone.set --stone "$STONE" --as absorbed --that "$LANE"