#!/usr/bin/env bash
######################################################################
# .what = exit with code 2 (graceful failure) and stderr
# .why = test fixture to validate graceful error output format
######################################################################

echo "quota error: no commit uses granted" >&2
exit 2
