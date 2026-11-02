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
#
# guarantee:
#   - sources the profile from keyrack (unlock + get), as aws.whoami does
#   - prints wall ms, exit code, and the count of exported vars per run
#   - never prints a credential value
######################################################################

set -euo pipefail

ENV=""
RUNS="1"
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
    # the dispatcher's own flags, recognized so the default arm stays a true refusal
    --repo|--role|--skill)
      shift 2
      ;;
    *)
      echo "aws.export.probe: unknown arg: $1" >&2
      echo "usage: aws.export.probe --env <test|prep|prod> [--runs N]" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$ENV" ]]; then
  echo "usage: aws.export.probe --env <test|prep|prod> [--runs N]" >&2
  exit 2
fi

npx rhx keyrack unlock --owner ehmpath --env "$ENV" >/dev/null
AWS_PROFILE="$(npx rhx keyrack get --owner ehmpath --env "$ENV" --key AWS_PROFILE --value)"
if [[ -z "$AWS_PROFILE" ]]; then
  echo "aws.export.probe: keyrack returned no AWS_PROFILE for env=$ENV" >&2
  exit 2
fi

SINCE_MS=$(date +%s%3N)
echo "aws version    = $(aws --version 2>&1)"
echo "cli startup    = $(( $(date +%s%3N) - SINCE_MS ))ms (aws --version alone)"
echo "host load      = $(cut -d' ' -f1-3 /proc/loadavg) · $(nproc) cpus"
echo "profile        = $AWS_PROFILE"
for RUN in $(seq 1 "$RUNS"); do
  SINCE_MS=$(date +%s%3N)
  set +e
  OUT="$(aws configure export-credentials --profile "$AWS_PROFILE" --format env 2>&1)"
  CODE=$?
  set -e
  ELAPSED_MS=$(( $(date +%s%3N) - SINCE_MS ))
  VARS=$(printf '%s\n' "$OUT" | grep -c '^export ' || true)
  echo "run $RUN          = ${ELAPSED_MS}ms · exit $CODE · $VARS vars exported"
  if [[ "$CODE" != "0" ]]; then
    printf '%s\n' "$OUT" | grep -v -i 'secret\|token\|key' | head -5
  fi
done
