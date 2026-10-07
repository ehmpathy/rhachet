#!/usr/bin/env bash
######################################################################
# 🧮 calc.tokens — count the real token cost of a fileset
#
# .what = counts tokens with a real bpe tokenizer, and grades an
#         estimator (e.g. `chars / 4`) against that truth
#
# .why  = a boot budget gates on a token count, so the count is measured
#
# usage:
#   run `rhx calc.tokens help` — `show_help()` below is the one source,
#   pinned by `calc.tokens.acceptance` `[case6]`.
#
# ⚠️ .note = `rhx` prints a 2-line `🪨 run solid skill …` banner to STDOUT ahead of every
#   skill, so a `--format json` pipe needs `| tail -n +3` to reach a bare json document.
#   the banner's stream is pinned by `blackbox/cli/run.graceful-errors.acceptance.test.ts`
#   ("stdout contains skill identifier").
#
# guarantee:
#   - exit 0 = measured
#   - exit 1 = malfunction (tokenizer fault, or a matched file that cannot be read)
#   - exit 2 = constraint (absent args, bad glob, no match, empty corpus, or a
#              matched file that VANISHED between the glob and the read)
#
#   .note = that last row is the glob/read race, and it is a constraint rather than a
#     malfunction because the caller's own tree moved — a re-run on a settled tree
#     fixes it, which is the test `rule.require.failloud` sorts the two classes by.
#
# .note = the domain-root 🧮 roots every line; no role mascot (rule.prefer.emoji-language).
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# save original args to pass to the typescript half
ORIGINAL_ARGS=("$@")

# ONE help text, reached from BOTH call sites. the pre-loop check serves a direct call where
# `help` is the first token; the in-loop arm serves an `rhx` call, which passes
# `--skill/--repo/--role` ahead of the caller's own args (rule.require.skill-help).
show_help() {
  echo "🧮 calc.tokens — count the real token cost of a fileset"
  echo ""
  echo "usage:"
  echo "  rhx calc.tokens --paths '<glob>' [--against <slug>] [--top N] [--format <fmt>]"
  echo ""
  echo "options:"
  # .note = lowercase, like every other line here and the peer skills' help
  #   (`rule.forbid.snapshot-visual-blemishes`, `rule.prefer.lowercase`)
  echo "  --paths     required. files to measure. repeatable — pass it once per glob."
  echo "              quote the glob, or the shell expands it before we see it."
  echo "  --against   optional. estimator to grade against the real count."
  echo "              one of: chars-div-4, chars-div-3.97"
  echo "  --top       optional. list the N densest files, densest first — the files"
  echo "              where a flat divisor errs worst. a non-negative integer."
  echo "              default 0, which omits the section."
  echo "  --format    optional. tree (default) for a human, json for a pipe."
  echo "              🟡 under rhx, a 2-line banner precedes it on stdout —"
  echo "                 pipe through 'tail -n +3' to reach a bare json document."
  echo ""
  echo "exits:"
  echo "  0  measured"
  echo "  1  malfunction — tokenizer fault, or a matched file that cannot be read"
  echo "  2  constraint  — absent args, bad glob, no match, empty corpus, or a"
  echo "                   matched file that vanished between the glob and the read"
  echo ""
  # .note = this text renders to a caller, so it names no repo rule slug — a slug is
  #   jargon a caller cannot dereference (`rule.require.errors-name-the-fix`).
  echo "  .note = that last row is the glob/read race. it is a constraint rather than a"
  echo "    malfunction because the caller's own tree moved — a re-run on a settled tree"
  echo "    fixes it, and that is the test: who has to act to make it pass?"
  echo ""
  echo "examples:"
  echo "  rhx calc.tokens --paths '.agent/**/*.md'"
  echo "  rhx calc.tokens --paths '.agent/**/*.md' --against chars-div-4 --top 8"
  echo "  rhx calc.tokens --paths 'src/**/*.ts' --paths 'blackbox/**/*.ts'"
  echo "  rhx calc.tokens --paths 'src/**/*.ts' --format json | tail -n +3 | jq"
  exit 0
}

# help, ahead of the loop — for a direct call where `help` is the first token
if [[ "${1:-}" == "help" || "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  show_help
fi

# belay when a flag's value is absent or is itself a flag.
# named args (`rule.forbid.positional-args`): flag=<name> value=<candidate> [valid=<set>]
require_val() {
  local flag="" value="" valid="" arg
  for arg in "$@"; do
    case "$arg" in
      flag=*) flag="${arg#flag=}" ;;
      value=*) value="${arg#value=}" ;;
      valid=*) valid="${arg#valid=}" ;;
    esac
  done
  if [[ -z "$value" || "$value" == --* ]]; then
    echo "🧮 calc.tokens" >&2
    echo "   ├─ ran: rhx calc.tokens ${ORIGINAL_ARGS[*]}" >&2
    echo "   ├─ ✋ ConstraintError: absent value for $flag" >&2
    # `valid:` names the accepted set; `hint:` below is the one remedy label
    # (`rule.forbid.domain-term-synonyms`)
    [[ -n "$valid" ]] && echo "   ├─ valid: $valid" >&2
    echo "   └─ hint: rhx calc.tokens help" >&2
    exit 2
  fi
}

# parse arguments
PATHS_COUNT=0
AGAINST=""
FORMAT="tree"
TOP=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --paths)
      # a glob is free-form, so no valid set. the typescript half reads the value.
      require_val flag=--paths value="${2:-}"
      PATHS_COUNT=$((PATHS_COUNT + 1))
      shift 2
      ;;
    --against)
      require_val flag=--against value="${2:-}" valid="chars-div-4 or chars-div-3.97"
      AGAINST="$2"
      shift 2
      ;;
    --top)
      require_val flag=--top value="${2:-}"
      TOP="$2"
      shift 2
      ;;
    --format)
      require_val flag=--format value="${2:-}" valid="tree or json"
      FORMAT="$2"
      shift 2
      ;;
    --skill|--repo|--role)
      # rhachet prepends these; skip the flag and its value. require_val guards the
      # shift: `shift 2` past the end returns non-zero, which `set -e` turns into a
      # silent exit 1 (rule.require.exit-code-semantics).
      require_val flag="$1" value="${2:-}"
      shift 2
      ;;
    --)
      shift
      ;;
    help|--help|-h)
      show_help
      ;;
    *)
      # an unknown flag is refused here, by name; the typescript half skips unknown tokens
      echo "🧮 calc.tokens" >&2
      echo "   ├─ ran: rhx calc.tokens ${ORIGINAL_ARGS[*]}" >&2
      echo "   ├─ ✋ ConstraintError: unknown argument: $1" >&2
      echo "   └─ hint: rhx calc.tokens help" >&2
      exit 2
      ;;
  esac
done

# --paths is the one required flag
if [[ "$PATHS_COUNT" -eq 0 ]]; then
  echo "🧮 calc.tokens" >&2
  echo "   ├─ ran: rhx calc.tokens ${ORIGINAL_ARGS[*]}" >&2
  echo "   ├─ ✋ ConstraintError: absent required arg: --paths" >&2
  echo "   └─ hint: name the files to measure, and quote the glob — e.g. rhx calc.tokens --paths '.agent/**/*.md'" >&2
  exit 2
fi

# the closed sets are checked here; the typescript half defaults unknown values
if [[ "$FORMAT" != "tree" && "$FORMAT" != "json" ]]; then
  echo "🧮 calc.tokens" >&2
  echo "   ├─ ran: rhx calc.tokens ${ORIGINAL_ARGS[*]}" >&2
  echo "   ├─ ✋ ConstraintError: invalid format: $FORMAT" >&2
  echo "   └─ valid: tree or json" >&2
  exit 2
fi

# estimator: closed set
if [[ -n "$AGAINST" && "$AGAINST" != "chars-div-4" && "$AGAINST" != "chars-div-3.97" ]]; then
  echo "🧮 calc.tokens" >&2
  echo "   ├─ ran: rhx calc.tokens ${ORIGINAL_ARGS[*]}" >&2
  echo "   ├─ ✋ ConstraintError: invalid estimator: $AGAINST" >&2
  echo "   └─ valid: chars-div-4 or chars-div-3.97" >&2
  exit 2
fi

# top: a non-negative integer
if [[ -n "$TOP" && ! "$TOP" =~ ^[0-9]+$ ]]; then
  echo "🧮 calc.tokens" >&2
  echo "   ├─ ran: rhx calc.tokens ${ORIGINAL_ARGS[*]}" >&2
  echo "   ├─ ✋ ConstraintError: invalid top: $TOP" >&2
  echo "   └─ hint: pass a non-negative integer, e.g. --top 8" >&2
  exit 2
fi

# run the typescript implementation
# via this repo's own pinned tsx — `npx tsx` resolves from the cwd, so a cwd outside
#   this repo downloads tsx and prints the fetch to stderr
TSX_BIN="$SCRIPT_DIR/../../../../node_modules/.bin/tsx"
if [ ! -x "$TSX_BIN" ]; then
  echo "💥 MalfunctionError: tsx is not installed in this repo" >&2
  echo "   └─ hint: pnpm install" >&2
  exit 1
fi
exec "$TSX_BIN" "$SCRIPT_DIR/calc.tokens.ts" "${ORIGINAL_ARGS[@]}"
