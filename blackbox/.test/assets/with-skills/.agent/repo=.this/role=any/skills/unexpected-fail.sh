#!/usr/bin/env bash
######################################################################
# .what = exit with code 1 (unexpected failure) and stderr
# .why = test fixture to validate unexpected error output format
######################################################################

echo "jq: command not found" >&2
exit 1
