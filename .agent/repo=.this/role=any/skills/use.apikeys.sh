#!/bin/sh
######################################################################
# .what = export api keys for integration tests
# .why = enables tests that require api keys to run
#
# usage:
#   . .agent/repo=.this/role=any/skills/use.apikeys.sh
#
# note:
#   - must be called with `.` or `source` to export vars to current shell
#   - loads from ~/.config/rhachet/apikeys.env if available
#   - falls back to .env.local (gitignored) in repo root
######################################################################

# fail if not sourced (return only succeeds when sourced)
(return 0 2>/dev/null) || {
  echo "error: this file must be sourced, not executed"
  echo "usage: . $0"
  exit 1
}

# alias source to `.` for posix compat
source() { . "$@"; }

# try to load from user config first
if [ -f ~/.config/rhachet/apikeys.env ]; then
  source ~/.config/rhachet/apikeys.env
  echo "✓ loaded api keys from ~/.config/rhachet/apikeys.env"

# fallback to local gitignored file
elif [ -f .env.local ]; then
  source .env.local
  echo "✓ loaded api keys from .env.local"

else
  echo "⚠ no api keys file found"
  echo ""
  echo "create one of:"
  echo "  ~/.config/rhachet/apikeys.env"
  echo "  .env.local (in repo root)"
  echo ""
  echo "with contents like:"
  echo "  export OPENAI_API_KEY=sk-..."
  echo "  export ANTHROPIC_API_KEY=sk-..."
  return 1 2>/dev/null || exit 1
fi

# read required keys from json config if present
APIKEYS_CONFIG=".agent/repo=.this/role=any/skills/use.apikeys.json"
if [ -f "$APIKEYS_CONFIG" ]; then
  # extract required keys via jq
  REQUIRED_KEYS=$(jq -r '.apikeys.required[]?' "$APIKEYS_CONFIG" 2>/dev/null)

  # verify each required key is set
  for KEY in $REQUIRED_KEYS; do
    VALUE=$(eval "echo \"\$$KEY\"")
    if [ -z "$VALUE" ]; then
      echo "⚠ $KEY not set (required by $APIKEYS_CONFIG)"
      return 1 2>/dev/null || exit 1
    fi
    echo "✓ $KEY set"
  done
fi
