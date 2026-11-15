#!/usr/bin/env bash
######################################################################
# .what = time `aws configure export-credentials` for the keyrack profile
#
# .why  = the aws.params integration tests export static creds through
#         this call (src/.test/infra/useKeyrack.ts) under a fixed bound.
#         when it times out, this measures the call's wall time and exit,
#         so the cause is measured, never guessed
#
# usage:
#   rhx aws.export.probe --env test
#   rhx aws.export.probe --env test --runs 3
#   rhx aws.export.probe --env test --runs 20 --every 60   # watch the expiry move
#
# guarantee:
#   - sources the profile from keyrack (unlock + get), as aws.whoami does
#   - prints wall ms, exit code, the count of exported vars, and the role
#     creds' expiry per run (`none` for static creds; a moved expiry
#     between runs means the cli re-derived rather than served its cache)
#   - never prints a credential value
######################################################################

set -euo pipefail

ENV=""
RUNS="1"
EVERY_S="0"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      ENV="$2"
      shift 2
      ;;
    --runs)
      RUNS="$2"
      shift 2
      ;;
    --every)
      EVERY_S="$2"
      shift 2
      ;;
    --help|-h|help)
      # print the header: what, why, usage, guarantee
      sed -n '3,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    # the dispatcher's own flags, recognized so the default arm stays a true refusal
    --repo|--role|--skill)
      shift 2
      ;;
    *)
      echo "✋ ConstraintError: aws.export.probe got an unknown arg: $1" >&2
      echo "   └─ usage: rhx aws.export.probe --env <test|prep|prod> [--runs N] [--every S]" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$ENV" ]]; then
  echo "✋ ConstraintError: aws.export.probe needs --env" >&2
  echo "   └─ usage: rhx aws.export.probe --env <test|prep|prod> [--runs N] [--every S]" >&2
  exit 2
fi

npx rhx keyrack unlock --owner ehmpath --env "$ENV" >/dev/null
AWS_PROFILE="$(npx rhx keyrack get --owner ehmpath --env "$ENV" --key AWS_PROFILE --value)"
if [[ -z "$AWS_PROFILE" ]]; then
  echo "✋ ConstraintError: keyrack returned no AWS_PROFILE for env=$ENV" >&2
  echo "   └─ fix: rhx keyrack status --owner ehmpath --env $ENV" >&2
  exit 2
fi

SINCE_MS=$(date +%s%3N)
echo "aws version    = $(aws --version 2>&1)"
echo "cli startup    = $(( $(date +%s%3N) - SINCE_MS ))ms (aws --version alone)"
echo "host load      = $(cut -d' ' -f1-3 /proc/loadavg) · $(nproc) cpus"
echo "profile        = $AWS_PROFILE"
for RUN in $(seq 1 "$RUNS"); do
  # space the runs, so a watch can catch the moment the cli re-derives
  if [[ "$RUN" -gt 1 && "$EVERY_S" -gt 0 ]]; then sleep "$EVERY_S"; fi
  SINCE_MS=$(date +%s%3N)
  set +e
  OUT="$(aws configure export-credentials --profile "$AWS_PROFILE" --format env 2>&1)"
  CODE=$?
  set -e
  ELAPSED_MS=$(( $(date +%s%3N) - SINCE_MS ))
  VARS=$(printf '%s\n' "$OUT" | grep -c '^export ' || true)
  # the role creds' expiry is no secret; it shows whether the cli re-derived or served its cache
  EXPIRY=$(printf '%s\n' "$OUT" | sed -n 's/^export AWS_CREDENTIAL_EXPIRATION=//p')
  echo "run $RUN          = at $(date -u +%H:%M:%S) · ${ELAPSED_MS}ms · exit $CODE · $VARS vars exported · expiry ${EXPIRY:-none}"
  if [[ "$CODE" != "0" ]]; then
    printf '%s\n' "$OUT" | grep -v -i 'secret\|token\|key' | head -5
  fi
done
