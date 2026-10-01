#!/usr/bin/env bash
######################################################################
# .what = search the readable text embedded in a claude-code install
#         (its native binary included) for a pattern, and print each
#         match with the code around it
#
# .why  = claude-code ships as a native binary with its js embedded as
#         strings. to learn how it behaves (a lock path, a refresh
#         flow, an env var it reads) a mechanic must search those
#         strings; a raw grep -a over a binary needs a permission grant
#         each time. this skill bounds that read to a probe install
#         inside the repo
#
# usage:
#   rhx claude.cli.probe --into .temp/claude-cli.probe --version 2.1.280
#   rhx claude.cli.strings --in .temp/claude-cli.probe --pattern 'credentials\.json'
#   rhx claude.cli.strings --in .temp/claude-cli.probe --pattern 'lockSync' --radius 400 --limit 5
#
# options:
#   --in       the probe prefix `claude.cli.probe --into` made; must sit
#              inside the repo (required)
#   --pattern  an extended regex to find (required)
#   --radius   chars of context on each side of a match (default: 200)
#   --limit    max distinct matches to print (default: 20)
#
# guarantee:
#   - reads only files under the probe's claude-code package, which
#     must sit inside the repo
#   - non-printable bytes are shown as '.', so a binary match prints
#     as one readable line
#   - duplicate matches are printed once; the total is reported
#   - exit 0 = searched (zero matches is a result, not an error)
#   - exit 1 = malfunction (the package or its files are unreadable)
#   - exit 2 = constraint (bad args, prefix outside the repo, no install)
######################################################################

set -euo pipefail

# parse args
IN=""
PATTERN=""
RADIUS="200"
LIMIT="20"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --in) IN="$2"; shift 2 ;;
    --pattern) PATTERN="$2"; shift 2 ;;
    --radius) RADIUS="$2"; shift 2 ;;
    --limit) LIMIT="$2"; shift 2 ;;
    # the rhx runner forwards its own dispatch flags; skip them
    --skill|--repo|--role) shift 2 ;;
    --help|-h)
      sed -n '2,36p' "$0"
      exit 0
      ;;
    *)
      echo "✋ ConstraintError: claude.cli.strings: unknown arg '$1'" >&2
      exit 2
      ;;
  esac
done

# validate the args
if [[ -z "$IN" || -z "$PATTERN" ]]; then
  echo "✋ ConstraintError: claude.cli.strings needs --in and --pattern" >&2
  echo "   usage: claude.cli.strings --in <probe-prefix> --pattern <regex> [--radius N] [--limit N]" >&2
  exit 2
fi
if ! [[ "$RADIUS" =~ ^[0-9]+$ && "$LIMIT" =~ ^[0-9]+$ ]]; then
  echo "✋ ConstraintError: --radius and --limit must be whole numbers" >&2
  exit 2
fi

# the probe prefix must sit inside the repo
REPO_ROOT="$(git rev-parse --show-toplevel)"
if [[ ! -d "$IN" ]]; then
  echo "✋ ConstraintError: no probe install at '$IN'" >&2
  echo "   fix: rhx claude.cli.probe --into $IN" >&2
  exit 2
fi
PREFIX="$(cd "$IN" && pwd -P)"
case "$PREFIX/" in
  "$REPO_ROOT"/*) ;;
  *)
    echo "✋ ConstraintError: --in must sit inside the repo ($REPO_ROOT)" >&2
    exit 2
    ;;
esac

# follow pnpm's symlink to the claude-code package, and keep it in the repo
PKG_LINK="$PREFIX/node_modules/@anthropic-ai/claude-code"
if [[ ! -e "$PKG_LINK" ]]; then
  echo "✋ ConstraintError: no @anthropic-ai/claude-code under '$IN'" >&2
  echo "   fix: rhx claude.cli.probe --into $IN" >&2
  exit 2
fi
PKG="$(cd "$PKG_LINK" && pwd -P)"
case "$PKG/" in
  "$REPO_ROOT"/*) ;;
  *)
    echo "✋ ConstraintError: the claude-code package lands outside the repo ($PKG)" >&2
    exit 2
    ;;
esac
# sed quits at its first match, so no `| head` can SIGPIPE it under pipefail
VERSION="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p;T;q' "$PKG/package.json")"

echo "🔭 claude.cli.strings --in $IN --pattern '$PATTERN' --radius $RADIUS --limit $LIMIT"
echo "   ├─ package: @anthropic-ai/claude-code@${VERSION:-unknown}"

# every file in the package must be readable, or a quiet grep would read as zero matches
# (find stops at the first one via -quit, so no `| head` can SIGPIPE it under pipefail)
UNREADABLE="$(find "$PKG" -path "$PKG/node_modules" -prune -o -type f ! -readable -print -quit)"
if [[ -n "$UNREADABLE" ]]; then
  echo "💥 MalfunctionError: unreadable file ${UNREADABLE#"$REPO_ROOT"/}" >&2
  exit 1
fi

# a pattern grep cannot compile must fail loud, never read as zero matches
# (grep exits 2 on a bad regex; 1 on no match; 0 on a match)
GREP_CHECK_STATUS=0
printf '' | grep -E "$PATTERN" >/dev/null 2>&1 || GREP_CHECK_STATUS=$?
if [[ "$GREP_CHECK_STATUS" -ge 2 ]]; then
  echo "✋ ConstraintError: --pattern is not a valid extended regex: '$PATTERN'" >&2
  exit 2
fi

# search every regular file in the package, the native binary included
# (xargs exits 123 when a grep batch exits 1-125: a batch with no match exits 1, and
#  grep's other exit, 2, is closed off above — a bad regex by the check, an unreadable
#  file by the scan. so 123 is a clean result; any other nonzero status — find, xargs,
#  tr, or awk failed — is a failed search and fails loud.
#  LC_ALL=C lets '.' match any byte — a utf-8 locale skips a binary's invalid bytes.
#  the files are sorted by path, so the same install always reports its matches in one order)
SEARCH_STATUS=0
MATCHES="$(
  find "$PKG" -path "$PKG/node_modules" -prune -o -type f -print0 \
    | LC_ALL=C sort -z \
    | LC_ALL=C xargs -0 grep -a -o -h -E ".{0,$RADIUS}($PATTERN).{0,$RADIUS}" \
    | LC_ALL=C tr -c '[:print:]\n' '.' \
    | awk '!seen[$0]++'
)" || SEARCH_STATUS=$?
if [[ "$SEARCH_STATUS" -ne 0 && "$SEARCH_STATUS" -ne 123 ]]; then
  echo "💥 MalfunctionError: the search failed with exit $SEARCH_STATUS; no match count is reported" >&2
  exit 1
fi

# .what = the count of lines in a text; 0 for an empty text
# .why = wc never exits nonzero on an empty input, so no status must be swallowed
#   usage: count_lines text=<text>
count_lines() {
  local text="" arg
  for arg in "$@"; do
    case "$arg" in
      text=*) text="${arg#text=}" ;;
      *) echo "💥 MalfunctionError: count_lines: unknown arg '$arg'" >&2; exit 1 ;;
    esac
  done
  if [[ -z "$text" ]]; then
    echo 0
    return
  fi
  printf '%s\n' "$text" | wc -l | tr -d ' '
}

# .what = the lesser of two whole numbers
#   usage: min_of a=<n> b=<n>
min_of() {
  local a="" b="" arg
  for arg in "$@"; do
    case "$arg" in
      a=*) a="${arg#a=}" ;;
      b=*) b="${arg#b=}" ;;
      *) echo "💥 MalfunctionError: min_of: unknown arg '$arg'" >&2; exit 1 ;;
    esac
  done
  if [[ "$a" -lt "$b" ]]; then echo "$a"; else echo "$b"; fi
}

# report
TOTAL="$(count_lines text="$MATCHES")"
echo "   ├─ matches: $TOTAL distinct"
if [[ "$TOTAL" -eq 0 ]]; then
  echo "   └─ crickets"
  exit 0
fi
echo "   └─ shown: first $(min_of a="$TOTAL" b="$LIMIT")"
echo ""
# awk consumes all input, so the producer never meets a closed pipe
# (a `| head` here SIGPIPEs printf under pipefail and exits 141 on a broad pattern)
printf '%s\n' "$MATCHES" | awk -v limit="$LIMIT" 'NR <= limit { print "────"; print }'
