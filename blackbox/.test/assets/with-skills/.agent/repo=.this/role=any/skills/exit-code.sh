#!/usr/bin/env bash
######################################################################
# .what = exit with the specified exit code
# .why = test fixture to validate exit code passthrough
#
# usage:
#   exit-code.sh --code 0   # exit with code 0
#   exit-code.sh --code 2   # exit with code 2
#   exit-code.sh --code 127 # exit with code 127
######################################################################

# parse --code flag from args
exit_code=1
while [[ $# -gt 0 ]]; do
  case "$1" in
    --code)
      exit_code="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

echo "exit code: $exit_code"
exit "$exit_code"
