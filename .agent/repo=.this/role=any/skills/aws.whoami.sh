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

# source aws credentials from keyrack (ghlitch pattern):
# - unlock validates/refreshes the sso session for the aws.config key
# - get fetches the profile value into this shell (unlock runs in a subprocess,
#   so its env does not propagate back — the explicit get + export is required)
npx rhx keyrack unlock --owner ehmpath --env "$ENV"

# capture the profile as a PLAIN assignment (not `export VAR=$(...)`): under `set -e`, an
# `export VAR=$(...)` masks the substitution's exit code because `export` itself always
# succeeds, so a failed keyrack get would leave AWS_PROFILE empty and execution would march
# on. a bare assignment lets `set -e` propagate the get failure.
AWS_PROFILE="$(npx rhx keyrack get --owner ehmpath --env "$ENV" --key AWS_PROFILE --value)"

# fail loud on an empty profile — never hand `aws sts` an empty profile that dies with the
# opaque "config profile () could not be found"
if [[ -z "$AWS_PROFILE" ]]; then
  echo "aws.whoami: keyrack returned no AWS_PROFILE for env=$ENV — unlock the session first" >&2
  # a caller-fixable constraint (unlock the session) → exit 2, to match the usage-error exit
  # above (rule.require.exit-code-semantics); exit 1 would falsely signal a server malfunction
  exit 2
fi
export AWS_PROFILE

# check identity
aws sts get-caller-identity
