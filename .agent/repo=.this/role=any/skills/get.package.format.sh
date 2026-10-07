#!/usr/bin/env bash
######################################################################
# 🧮 get.package.format — is this package requireable from commonjs?
#
# .what = reports an installed package's module format, and proves it with a
#         real `require()` in a child process
#
# .why  = a cjs consumer needs to know: can it `require()` this package?
#         `"type": "module"` alone does not answer it — a dual-published
#         package declares it AND ships a `.cjs` entry, so a static import of
#         a dual package is safe while a static import of an esm-only
#         package is not. this skill tells the two apart
#         (`rule.forbid.eager-esm-imports-in-prod`).
#
# usage:
#   run `rhx get.package.format help` — `show_help()` below is the one
#   source, pinned by `get.package.format.acceptance` `[case5]`.
#
# verdicts — taken from the manifest, with the probe as evidence beside it:
#   cjs        `type` is not module             → a static import is safe
#   dual       `type: module` + a cjs entry     → a static import is safe
#   esm-only   `type: module`, no cjs entry     → route it through
#              `getOneLazyEsmModuleLoader` (`rule.forbid.eager-esm-imports-in-prod`)
#
# .note = the verdict reads the manifest, not the probe alone. a modern node
#   can `require()` an esm package, so a green probe does not prove safety —
#   `age-encryption` (esm-only, routed through `getOneLazyEsmModuleLoader`)
#   probes `✅ loads` on node v24. the probe is reported beside the verdict,
#   with its runtime named.
#
# guarantee:
#   exit 0 = measured — an `esm-only` verdict is an answer, never a refusal
#   exit 1 = malfunction (the probe could not run)
#   exit 2 = constraint (absent args, unknown flag, package not installed)
#
# .note = reads `node_modules`, never the registry — reports what this tree
#   actually resolved, the only version that can break this build.
#
# .note = the domain-root 🧮 roots every line; no role mascot (`rule.prefer.emoji-language`).
######################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# .note = no blank line before the header — rhachet's own banner already prints one
#   ahead of every skill (`rule.forbid.snapshot-visual-blemishes`).
show_help() {
  echo "🧮 get.package.format — is this package requireable from commonjs?"
  echo ""
  echo "usage:"
  echo "  rhx get.package.format --package js-tiktoken"
  echo ""
  echo "options:"
  echo "  --package NAME   the installed package to measure (required)"
  echo ""
  # .note = lowercase throughout, like the peer skills' help (`rule.prefer.lowercase`).
  #   `NAME` above is an arg metavar, never emphasis.
  echo "verdicts (taken from the manifest — the probe is evidence beside it):"
  echo "  cjs        type is not module            → static import is safe"
  echo "  dual       type: module + a cjs entry    → static import is safe"
  echo "  esm-only   type: module, no cjs entry    → use getOneLazyEsmModuleLoader"
  echo ""
  echo "🟡 a green probe does not mean safe. node 22.12+ loads a synchronous esm"
  echo "   graph through require(), so a pure-esm package probes green here while"
  echo "   jest's cjs runtime and older node still refuse it."
  echo ""
  echo "exits:"
  echo "  0  measured — an esm-only verdict is an answer, never a refusal"
  echo "  1  malfunction — the probe could not run"
  echo "  2  constraint  — absent args, unknown flag, package not installed"
  echo ""
}

# .what = the one refusal render, shared by every constraint this half can raise
# named args (`rule.forbid.positional-args`): message=<what> hint=<the next step>
belay() {
  local message="" hint="" arg
  for arg in "$@"; do
    case "$arg" in
      message=*) message="${arg#message=}" ;;
      hint=*) hint="${arg#hint=}" ;;
    esac
  done
  echo "🧮 get.package.format" >&2
  echo "   ├─ ran: rhx get.package.format ${ARGS_ORIGINAL[*]}" >&2
  echo "   ├─ ✋ ConstraintError: $message" >&2
  echo "   └─ hint: $hint" >&2
  exit 2
}

# ONE help text, reached from BOTH call sites. the pre-loop check serves a direct call where
# `help` is the first token; the in-loop arm serves an `rhx` call, which passes
# `--skill/--repo/--role` ahead of the caller's own args (rule.require.skill-help).
if [ "${1:-}" = "help" ] || [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  show_help
  exit 0
fi

# belay when a flag's value is absent or is itself a flag.
# named args (`rule.forbid.positional-args`): flag=<name> value=<candidate>
require_val() {
  local flag="" value="" arg
  for arg in "$@"; do
    case "$arg" in
      flag=*) flag="${arg#flag=}" ;;
      value=*) value="${arg#value=}" ;;
    esac
  done
  if [ -z "$value" ]; then
    belay message="$flag needs a value" hint="rhx get.package.format help"
  fi
  case "$value" in
    -*) belay message="$flag needs a value, but was handed the flag $value" hint="rhx get.package.format help" ;;
  esac
}

ARGS_ORIGINAL=("$@")
PACKAGE_COUNT=0
while [[ $# -gt 0 ]]; do
  case $1 in
    --package)
      require_val flag=--package value="${2:-}"
      PACKAGE_COUNT=$((PACKAGE_COUNT + 1))
      shift 2
      ;;
    --skill | --repo | --role)
      # rhachet prepends these; skip the flag and its value. require_val guards the
      # shift: `shift 2` past the end returns non-zero, which `set -e` turns into a
      # silent exit 1 (rule.require.exit-code-semantics).
      require_val flag="$1" value="${2:-}"
      shift 2
      ;;
    --)
      shift
      ;;
    help | --help | -h)
      show_help
      exit 0
      ;;
    -*)
      # an unknown flag is refused by name
      belay message="unknown flag: $1" hint="rhx get.package.format help"
      ;;
    *)
      belay message="unexpected argument: $1" hint="rhx get.package.format --package <name>"
      ;;
  esac
done

# --package is the one required flag — without it there is naught to measure
if [ "$PACKAGE_COUNT" -eq 0 ]; then
  belay message="--package is required" hint="rhx get.package.format --package js-tiktoken"
fi

exec npx tsx "$SCRIPT_DIR/get.package.format.ts" "${ARGS_ORIGINAL[@]}"
