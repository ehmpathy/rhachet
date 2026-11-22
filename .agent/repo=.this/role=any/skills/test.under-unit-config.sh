#!/usr/bin/env bash
######################################################################
# .what = run test files under the UNIT jest config
#
# .why  = an integration test that needs no api key (a fs clamp, a git
#         probe) can still be exercised on a host whose keyrack lacks the
#         brain api keys the integration globalSetup strictly sources.
#         the unit config sources no keys, so the files run as-is
#
# guarantee:
#   - runs exactly the files named, and no other
#   - every --file is relative to the repo root, wherever the caller stands
#   - --name filters by test name (jest -t), e.g. to skip a case that needs keys
#   - exit code is jest's own (its bin, never a package runner); its report goes to stdout
#   - jest waits on open handles, so a leak reads as a hang, never a pass;
#     --force-exit opts out, for a suite whose daemons outlive its last test
######################################################################
set -euo pipefail

# the repo root: this executable sits at .agent/repo=.this/role=any/skills/
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
INVOCATION="rhx test.under-unit-config $*"

say_help() {
  cat <<'HELP'
usage:
  rhx test.under-unit-config --file <path> [--file <path> ...] [--name '<regex>'] [--force-exit]

options:
  --file <path>     a test file to run, relative to the repo root (repeatable)
  --name <regex>    run only the tests whose name matches (jest -t)
  --force-exit      exit once the tests report, even if a handle is still open
  --help, -h        show this help

example:
  rhx test.under-unit-config --file src/.test/infra/genTempDirPhysical.integration.test.ts
HELP
}

# a caller-fixable refusal: name the class, say what is wrong, echo the call, point at the help
refuse() {
  echo "✋ ConstraintError: $1" >&2
  echo "   ├─ ran: ${INVOCATION}" >&2
  echo "   └─ see: rhx test.under-unit-config --help" >&2
  exit 2
}

FILES=()
NAME=""
FORCE_EXIT="false"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --file|--name)
      # a flag in the value slot is an absent value, never a value
      [[ $# -ge 2 && -n "$2" && "$2" != --* ]] || refuse "$1 needs a value"
      if [[ "$1" == "--file" ]]; then FILES+=("$2"); else NAME="$2"; fi
      shift 2
      ;;
    --force-exit) FORCE_EXIT="true"; shift ;;
    # the dispatcher's own args, passed through by `rhx`
    --skill|--repo|--role)
      [[ $# -ge 2 && -n "$2" && "$2" != --* ]] || refuse "$1 needs a value"
      shift 2
      ;;
    --help|-h) say_help; exit 0 ;;
    *) refuse "unknown option: $1" ;;
  esac
done

[[ ${#FILES[@]} -gt 0 ]] || refuse "at least one --file is required"

ARGS=(-c "$REPO_ROOT/jest.unit.config.ts" --rootDir "$REPO_ROOT" --testMatch)
for FILE in "${FILES[@]}"; do
  FILE="${FILE#./}"
  # each wrong shape names itself: an absolute path, a dir, an absent path
  [[ "$FILE" != /* ]] || refuse "--file takes a path relative to the repo root, not an absolute one: $FILE"
  [[ -e "$REPO_ROOT/$FILE" ]] || refuse "no such file, relative to the repo root: $FILE"
  [[ -f "$REPO_ROOT/$FILE" ]] || refuse "not a file (a test file is owed, not a dir): $FILE"
  ARGS+=("<rootDir>/$FILE")
done
if [[ -n "$NAME" ]]; then
  ARGS+=(-t "$NAME")
fi
if [[ "$FORCE_EXIT" == "true" ]]; then
  ARGS+=(--forceExit)
fi

JEST_BIN="$REPO_ROOT/node_modules/.bin/jest"
[[ -x "$JEST_BIN" ]] || refuse "no jest bin at node_modules/.bin/jest; install the repo deps first (pnpm install)"

# from the repo root, so the relative paths jest reads (setup files, the env file) are found
cd "$REPO_ROOT"

# jest reports on stderr; merge it into stdout so a pass shows its counts, not silence
exec "$JEST_BIN" "${ARGS[@]}" 2>&1
