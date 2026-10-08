#!/usr/bin/env bash
######################################################################
# 📦 install.age — put the `age` encryption cli on PATH, the way cicd does
#
# .what = installs the `age` cli, matched byte-for-byte to the command
#         cicd runs at `.github/workflows/.test.yml:209`
#
# .why  = two integration suites require `age` on PATH and fail loud
#         without it (`rule.require.failfast`, which they honor):
#           - src/infra/ssh/sshPrikeyToAgeIdentity.integration.test.ts
#           - src/domain.operations/keyrack/recipient/recipient.integration.test.ts
#
#         cicd installs it, so the tier is green there and red on a
#         fresh dev box.
#
# ⚠️ .note = this is `age` the encryption tool (github.com/FiloSottile/age).
#   the npm package named `age` is an unrelated "Abstract Gameification
#   Engine" with no `bin` at all — it cannot put a binary on PATH.
#
# usage:
#   run `rhx install.age help` — `show_help()` below is the one source.
#
# guarantee:
#   - exit 0 = `age` is on PATH (already there, or installed now)
#   - exit 1 = malfunction (the package manager failed)
#   - exit 2 = constraint (no sudo, unsupported platform, bad args)
#
#   .note = idempotent. an `age` already on PATH is a no-op, never a
#     reinstall — so this is safe to run before any keyrack suite.
#
# .note = the domain-root 📦 roots every line; no role mascot (rule.prefer.emoji-language).
######################################################################
set -euo pipefail

# original args, captured before any shift — every refusal below echoes it
ARGS_ORIGINAL=("$@")

# the command cicd runs. source: .github/workflows/.test.yml:208-209 — `- name: install age cli` / `run: sudo apt-get install -y age`
readonly CICD_INSTALL_CMD="sudo apt-get install -y age"

show_help() {
  echo "📦 install.age — put the 'age' encryption cli on PATH, the way cicd does"
  echo ""
  echo "usage:"
  echo "  rhx install.age [--mode plan|apply]"
  echo ""
  echo "options:"
  echo "  --mode      optional. plan (default) prints what would run and changes naught."
  echo "              apply runs it."
  echo ""
  echo "what it runs:"
  echo "  $CICD_INSTALL_CMD"
  echo "  .why = matched to .github/workflows/.test.yml:209, so a dev box and cicd"
  echo "    provision the identical binary. a divergence here is a divergence in what"
  echo "    the two tiers actually test."
  echo ""
  echo "exits:"
  echo "  0  age is on PATH (already there, or installed now)"
  echo "  1  malfunction — the package manager failed"
  echo "  2  constraint  — no sudo, unsupported platform, or bad args"
  echo ""
  echo "who needs it:"
  echo "  src/infra/ssh/sshPrikeyToAgeIdentity.integration.test.ts"
  echo "  src/domain.operations/keyrack/recipient/recipient.integration.test.ts"
  echo ""
  echo "  🟡 the npm package named 'age' is an unrelated game engine with no bin."
  echo "     it cannot satisfy these suites. this skill installs the real cli."
  echo ""
  echo "examples:"
  echo "  rhx install.age                 # plan — show the command, change naught"
  echo "  rhx install.age --mode apply    # install it"
  exit 0
}

# help, ahead of the loop — for a direct call where help is the first token
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
    echo "📦 install.age" >&2
    echo "   ├─ ran: rhx install.age ${ARGS_ORIGINAL[*]}" >&2
    echo "   ├─ ✋ ConstraintError: absent value for $flag" >&2
    # `valid:` names the accepted set; `hint:` below is the one remedy label
    [[ -n "$valid" ]] && echo "   ├─ valid: $valid" >&2
    echo "   └─ hint: rhx install.age help" >&2
    exit 2
  fi
}

# read the version of the age on PATH. an age that cannot report its version is a broken
# binary, and surfaces as a malfunction with the cli's own error.
get_age_version() {
  local version
  if ! version="$(age --version 2>&1)"; then
    echo "📦 install.age" >&2
    echo "   ├─ ran: rhx install.age ${ARGS_ORIGINAL[*]}" >&2
    echo "   ├─ 💥 MalfunctionError: age is on PATH, but 'age --version' failed" >&2
    echo "   ├─ where: $(command -v age)" >&2
    echo "   ├─ error: $version" >&2
    # this row fires before the apt gate, so on any host — the cure must run on every one
    echo "   └─ hint: the binary is broken or foreign — reinstall per https://github.com/FiloSottile/age#installation" >&2
    exit 1
  fi
  echo "$version"
}

MODE="plan"
while [[ $# -gt 0 ]]; do
  case $1 in
    --mode)
      require_val flag=--mode value="${2:-}" valid="plan or apply"
      MODE="$2"
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
      # an unknown flag is refused by name, never dropped
      echo "📦 install.age" >&2
      echo "   ├─ ran: rhx install.age ${ARGS_ORIGINAL[*]}" >&2
      echo "   ├─ ✋ ConstraintError: unknown argument: $1" >&2
      echo "   └─ hint: rhx install.age help" >&2
      exit 2
      ;;
  esac
done

# mode: closed set, checked before any install
if [[ "$MODE" != "plan" && "$MODE" != "apply" ]]; then
  echo "📦 install.age" >&2
  echo "   ├─ ran: rhx install.age ${ARGS_ORIGINAL[*]}" >&2
  echo "   ├─ ✋ ConstraintError: invalid mode: $MODE" >&2
  echo "   └─ valid: plan or apply" >&2
  exit 2
fi

# already on PATH ⇒ a no-op, in plan or apply alike. this check precedes the apt gate.
if command -v age >/dev/null 2>&1; then
  # read before any line prints: a failed read in a bare assignment trips set -e, where
  # inside an echo it would only end the subshell and print an empty version
  AGE_VERSION="$(get_age_version)"
  echo "📦 install.age"
  echo "   ├─ ✨ already on PATH"
  echo "   ├─ where: $(command -v age)"
  echo "   └─ version: $AGE_VERSION"
  exit 0
fi

# apt is the one manager this skill mirrors, as cicd uses it
if ! command -v apt-get >/dev/null 2>&1; then
  echo "📦 install.age" >&2
  echo "   ├─ ran: rhx install.age ${ARGS_ORIGINAL[*]}" >&2
  echo "   ├─ ✋ ConstraintError: apt-get not found on this platform" >&2
  echo "   ├─ why: cicd installs age via apt (.github/workflows/.test.yml:209)," >&2
  echo "   │       so apt is the one manager this skill mirrors" >&2
  echo "   └─ hint: install age per https://github.com/FiloSottile/age#installation" >&2
  exit 2
fi

# plan is the default — print the command that would run, and change naught
if [[ "$MODE" == "plan" ]]; then
  # the header is the bare command name, as on every other branch of this skill
  # (`rule.forbid.snapshot-visual-blemishes`).
  echo "📦 install.age"
  echo "   ├─ age: not on PATH"
  echo "   ├─ would run"
  echo "   │  └─ $CICD_INSTALL_CMD"
  echo "   ├─ source: .github/workflows/.test.yml:209 — identical to cicd"
  echo "   └─ hint: rerun with --mode apply to install"
  exit 0
fi

# apply. sudo must be present and usable; a refusal names the exact command
if ! command -v sudo >/dev/null 2>&1; then
  echo "📦 install.age" >&2
  echo "   ├─ ran: rhx install.age ${ARGS_ORIGINAL[*]}" >&2
  echo "   ├─ ✋ ConstraintError: sudo not found, and apt needs it" >&2
  echo "   └─ hint: ask a human with root to install age — apt-get install -y age, run as root," >&2
  echo "            or per https://github.com/FiloSottile/age#installation" >&2
  exit 2
fi

# a sudo on PATH may still be unusable: one that needs a password needs a tty to ask for it.
# that is a constraint (a human holds the key), so probe it before apt runs.
#
# two different questions:
#     `sudo -n true`     = can sudo run with no password?   (passwordless / cached)
#     `( : >>/dev/tty )` = can sudo ask for one?             (a tty opens)
#   sudo is usable when either holds. the tty probe opens a character device for append
#   alone, so it never creates or truncates a file. it runs in a subshell: a bare
#   `: >>/dev/tty 2>/dev/null` prints bash's own "No such device" line, since the
#   suppression applies after the failed redirect.
#
# .note = the tty path is read from `INSTALL_AGE_TEST_TTY_PATH`; unset means `/dev/tty`.
TTY_PATH="${INSTALL_AGE_TEST_TTY_PATH:-/dev/tty}"
if sudo -n true >/dev/null 2>&1; then
  : # passwordless or a cached credential — sudo runs unattended
elif [[ -c "$TTY_PATH" ]] && ( : >>"$TTY_PATH" ) 2>/dev/null; then
  : # a tty exists — sudo can prompt, and a human can answer
else
  echo "📦 install.age" >&2
  echo "   ├─ ran: rhx install.age ${ARGS_ORIGINAL[*]}" >&2
  echo "   ├─ ✋ ConstraintError: sudo needs a password, and this shell has no tty" >&2
  echo "   ├─ why: sudo reads its password from a tty, and this shell has none" >&2
  echo "   └─ hint: ask a human to run — $CICD_INSTALL_CMD" >&2
  exit 2
fi

echo "📦 install.age"
echo "   ├─ age: not on PATH"
echo "   └─ run: $CICD_INSTALL_CMD"

# run the declared command
# shellcheck disable=SC2086 # word-split on purpose: the constant is a whole command line
if ! $CICD_INSTALL_CMD; then
  echo "📦 install.age" >&2
  echo "   ├─ ran: rhx install.age ${ARGS_ORIGINAL[*]}" >&2
  echo "   ├─ 💥 MalfunctionError: apt-get failed" >&2
  echo "   ├─ tried: $CICD_INSTALL_CMD" >&2
  echo "   └─ hint: a stale index is the usual cause — sudo apt-get update, then retry" >&2
  exit 1
fi

# verify the binary is on PATH; a zero exit from apt is not proof of one
# (rule.forbid.mechanism-inferred-from-outcome)
if ! command -v age >/dev/null 2>&1; then
  echo "📦 install.age" >&2
  echo "   ├─ ran: rhx install.age ${ARGS_ORIGINAL[*]}" >&2
  echo "   ├─ 💥 MalfunctionError: apt reported success, but age is not on PATH" >&2
  echo "   └─ hint: check that \$PATH carries the apt bin dir (usually /usr/bin)" >&2
  exit 1
fi

# read the version before any line prints; a failed read is a malfunction
AGE_VERSION="$(get_age_version)"
echo ""
echo "📦 install.age"
echo "   ├─ ✨ installed"
echo "   ├─ where: $(command -v age)"
echo "   └─ version: $AGE_VERSION"
