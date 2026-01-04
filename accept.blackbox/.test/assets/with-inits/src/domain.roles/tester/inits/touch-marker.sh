#!/usr/bin/env bash
######################################################################
# .what = test init that creates a marker file
# .why = proves init script discovery and execution works
######################################################################

touch marker-file-created.txt
echo "init executed successfully"
