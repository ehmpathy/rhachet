#!/usr/bin/env bash
######################################################################
# .what = test init that reads stdin and writes to a file
# .why = proves pipe input passthrough works for Claude Code hooks
######################################################################

# read stdin and write to file for verification
cat > stdin-received.txt
