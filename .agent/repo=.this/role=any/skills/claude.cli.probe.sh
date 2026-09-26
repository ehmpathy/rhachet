#!/usr/bin/env bash
######################################################################
# .what = install claude-code via pnpm into a scratch prefix within
#         the repo, then report the version its bin prints
#
# .why  = proves the test install path for the claude cli end to end,
#         without raw pnpm or bin invocations that each need a
#         permission grant
#
# usage:
#   rhx claude.cli.probe --into .temp/claude-cli.probe
#   rhx claude.cli.probe --into .temp/claude-cli.probe --version 2.1.281
#
# options:
#   --into     scratch prefix; must sit inside the repo (required)
#   --version  claude-code version to install (default: latest)
#
# guarantee:
#   - pnpm only; an absent pnpm fails fast (rule.forbid.npm-in-tests)
#   - the prefix is created fresh; a prior prefix at that path is removed
#   - pnpm installs with the claude-code postinstall allowed, so the
#     native binary lands
#   - exit 0 = the bin ran and printed a version
#   - exit 1 = malfunction (install failed, bin failed)
#   - exit 2 = constraint (bad args, prefix outside the repo, no pnpm)
######################################################################

set -euo pipefail

# parse args
INTO=""
VERSION="latest"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --into) INTO="$2"; shift 2 ;;
    --version) VERSION="$2"; shift 2 ;;
    # the rhx runner forwards its own dispatch flags; skip them
    --skill|--repo|--role) shift 2 ;;
    --help|-h)
      sed -n '2,26p' "$0"
      exit 0
      ;;
    *)
      echo "claude.cli.probe: unknown arg '$1'" >&2
      exit 2
      ;;
  esac
done

# validate the prefix
if [[ -z "$INTO" ]]; then
  echo "usage: claude.cli.probe --into <dir-inside-repo> [--version x.y.z]" >&2
  exit 2
fi
REPO_ROOT="$(git rev-parse --show-toplevel)"
mkdir -p "$INTO"
PREFIX="$(cd "$INTO" && pwd -P)"
case "$PREFIX/" in
  "$REPO_ROOT"/*) ;;
  *)
    echo "claude.cli.probe: --into must sit inside the repo ($REPO_ROOT)" >&2
    exit 2
    ;;
esac
if [[ "$PREFIX" == "$REPO_ROOT" ]]; then
  echo "claude.cli.probe: --into must be a subdir, not the repo root" >&2
  exit 2
fi

# pnpm is required; npm is never a fallback
if ! command -v pnpm >/dev/null; then
  echo "claude.cli.probe: pnpm is required" >&2
  echo "  hint: corepack enable pnpm (or see https://pnpm.io/installation)" >&2
  exit 2
fi

# a fresh prefix, so a prior install never masks a skipped postinstall
rm -rf "$PREFIX"
mkdir -p "$PREFIX"
echo '{"private":true}' > "$PREFIX/package.json"

echo "claude.cli.probe --into $INTO --version $VERSION"

# install
PKG="@anthropic-ai/claude-code@$VERSION"
if ! pnpm add "$PKG" --dir "$PREFIX" --ignore-workspace --allow-build=@anthropic-ai/claude-code --reporter=silent; then
  echo "   └─ 💥 pnpm install failed" >&2
  exit 1
fi
echo "   ├─ installed: $PKG via pnpm"

# run the bin
BIN="$PREFIX/node_modules/.bin/claude"
if ! OUT="$("$BIN" --version)"; then
  echo "   └─ 💥 bin failed: $BIN --version" >&2
  exit 1
fi
echo "   ├─ bin: ${BIN#"$REPO_ROOT"/}"
echo "   └─ version: $OUT"
