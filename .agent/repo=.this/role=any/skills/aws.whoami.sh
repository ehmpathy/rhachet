#!/usr/bin/env bash
######################################################################
# .what = check aws identity after keyrack credential source
#
# .why  = enables aws sts get-caller-identity without permission
#         prompts for eval or command substitution
#
# usage:
#   rhx aws.whoami --env test
#   rhx aws.whoami --env prep
#
# guarantee:
#   - sources keyrack credentials for specified env
#   - runs aws sts get-caller-identity
#   - fail-fast on errors
######################################################################

set -euo pipefail

# parse args
ENV=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      ENV="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# validate
if [[ -z "$ENV" ]]; then
  echo "usage: aws.whoami --env <test|prep|prod>" >&2
  exit 2
fi

# source keyrack credentials (lenient to allow partial key sourcing)
eval "$(rhx keyrack source --owner ehmpath --env "$ENV" --lenient)"

# check identity
aws sts get-caller-identity
