#!/usr/bin/env bash
######################################################################
# .what = export api keys for integration tests
# .why = enables running integration tests that require api keys
#
# usage:
#   source .agent/repo=.this/role=robot/skills/use.apikeys.sh
#
# note:
#   - must be called with `source` to export vars to current shell
#   - loads from ~/.config/rhachet/apikeys.env if available
#   - falls back to .env.local (gitignored) in repo root
######################################################################

# fail if not sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "error: this script must be sourced, not executed"
  echo "usage: source ${BASH_SOURCE[0]}"
  exit 1
fi

# try loading from user config first
if [[ -f ~/.config/rhachet/apikeys.env ]]; then
  source ~/.config/rhachet/apikeys.env
  echo "✓ loaded api keys from ~/.config/rhachet/apikeys.env"

# fallback to local gitignored file
elif [[ -f .env.local ]]; then
  source .env.local
  echo "✓ loaded api keys from .env.local"

else
  echo "⚠ no api keys file found"
  echo ""
  echo "create one of:"
  echo "  ~/.config/rhachet/apikeys.env"
  echo "  .env.local (in repo root)"
  echo ""
  echo "with contents:"
  echo "  export OPENAI_API_KEY=sk-..."
  echo "  export ANTHROPIC_API_KEY=sk-..."
  echo "  export TAVILY_API_KEY=tvly-..."
  return 1
fi

# verify keys are set
if [[ -z "$OPENAI_API_KEY" ]]; then
  echo "⚠ OPENAI_API_KEY not set"
  return 1
fi
if [[ -z "$ANTHROPIC_API_KEY" ]]; then
  echo "⚠ ANTHROPIC_API_KEY not set"
  return 1
fi
if [[ -z "$TAVILY_API_KEY" ]]; then
  echo "⚠ TAVILY_API_KEY not set (get one at https://tavily.com)"
  return 1
fi

echo "✓ OPENAI_API_KEY set"
echo "✓ ANTHROPIC_API_KEY set"
echo "✓ TAVILY_API_KEY set"
