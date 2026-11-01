#!/usr/bin/env bash
######################################################################
# .what = ask the claude cli one tiny haiku prompt, and print what the
#         vendor answers: the reply, or the refusal text
#
# .why  = a vendor refusal (rate limit, no credit, a dead login) hangs a
#         repl brain rather than throws, so a live test fails on its
#         bound with no cause. this probe surfaces the vendor's own text,
#         on the same credential the hung test used
#
# usage:
#   rhx claude.vendor.probe                       # the box's login
#   rhx claude.vendor.probe --via keyrack-test    # the test env's api key
#   rhx claude.vendor.probe --timeout 60
#
# options:
#   --via      login (default) | keyrack-test
#              login: ANTHROPIC_API_KEY and ANTHROPIC_AUTH_TOKEN are
#              unset, so claude answers on the subscription login only
#              keyrack-test: the ehmpath test ANTHROPIC_API_KEY, as a
#              live test gets it; one haiku call billed to the api
#   --timeout  seconds to wait for an answer (default: 60)
#
# guarantee:
#   - --via login never bills the api
#   - --via keyrack-test bills one haiku call, never prints the key
#   - read only; it writes no file
#   - exit 0 = claude answered · 1 = claude refused, failed, or hung ·
#     2 = bad input
######################################################################
set -euo pipefail

TIMEOUT="60"
VIA="login"

# refuse with a named fix; every refusal carries one. an optional third arg is the cause line
refuse() {
  echo "✋ ConstraintError: $1" >&2
  if [[ -n "${3:-}" ]]; then
    echo "   ├─ cause" >&2
    echo "   │  └─ $3" >&2
  fi
  echo "   └─ fix" >&2
  echo "      └─ $2" >&2
  exit 2
}

# print the usage, the inputs, the guarantee, and a worked example
print_help() {
  echo "🐢 claude.vendor.probe — ask claude one tiny haiku prompt, and print what the vendor answers"
  echo "   ├─ usage"
  echo "   │  └─ rhx claude.vendor.probe [--via login|keyrack-test] [--timeout <seconds>]"
  echo "   ├─ inputs"
  echo "   │  ├─ --via      login (default) | keyrack-test"
  echo "   │  │  ├─ login unsets ANTHROPIC_API_KEY and ANTHROPIC_AUTH_TOKEN, so claude answers on the login"
  echo "   │  │  └─ keyrack-test passes the ehmpath test ANTHROPIC_API_KEY, as a live test gets it"
  echo "   │  └─ --timeout seconds to wait for an answer (default 60)"
  echo "   ├─ guarantee"
  echo "   │  ├─ --via login never bills the api"
  echo "   │  ├─ --via keyrack-test bills one haiku call, and never prints the key"
  echo "   │  ├─ read only; it writes no file"
  echo "   │  └─ exit 0 = claude answered · 1 = claude refused, failed, or hung · 2 = bad input"
  echo "   └─ example"
  echo "      ├─ rhx claude.vendor.probe"
  echo "      ├─ rhx claude.vendor.probe --via keyrack-test"
  echo "      └─ rhx claude.vendor.probe --timeout 60"
}

# parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill|--repo|--role) shift 2 ;;
    --) shift ;;
    --timeout) [[ $# -ge 2 ]] || refuse "--timeout needs a value" "rhx claude.vendor.probe --timeout 60"; TIMEOUT="$2"; shift 2 ;;
    --via) [[ $# -ge 2 ]] || refuse "--via needs a value" "rhx claude.vendor.probe --via login"; VIA="$2"; shift 2 ;;
    help|--help|-h) print_help; exit 0 ;;
    *) refuse "unknown arg '$1'" "rhx claude.vendor.probe --help" ;;
  esac
done
[[ "$TIMEOUT" =~ ^[0-9]+$ ]] || refuse "--timeout must be a whole number, got '$TIMEOUT'" "rhx claude.vendor.probe --timeout 60"
[[ "$VIA" == "login" || "$VIA" == "keyrack-test" ]] || refuse "--via must be login or keyrack-test, got '$VIA'" "rhx claude.vendor.probe --via login"

# fail fast if the cli is absent
command -v claude >/dev/null || refuse "no claude cli on PATH" "install claude code, then /login"

# the env of the probe: the login alone, or the test api key alone
ENV_ARGS=(-u ANTHROPIC_API_KEY -u ANTHROPIC_AUTH_TOKEN)
if [[ "$VIA" == "keyrack-test" ]]; then
  # a failed get (a locked keyrack, an unset key) refuses with the unlock, and its own first line
  #   as the cause; the get's stderr goes to a temp file, so the key on stdout stays apart
  GET_ERR="$(mktemp)"
  trap 'rm -f "$GET_ERR"' EXIT
  if ! KEY_TEST="$(npx rhx keyrack get --owner ehmpath --env test --key ANTHROPIC_API_KEY --value 2>"$GET_ERR")"; then
    refuse "keyrack could not get ANTHROPIC_API_KEY for env=test" "rhx keyrack unlock --owner ehmpath --env test" "$(head -n 1 "$GET_ERR")"
  fi
  [[ -n "$KEY_TEST" ]] || refuse "keyrack returned no ANTHROPIC_API_KEY for env=test" "rhx keyrack unlock --owner ehmpath --env test"
  ENV_ARGS=(-u ANTHROPIC_AUTH_TOKEN "ANTHROPIC_API_KEY=$KEY_TEST")
fi

# ask
echo "🧪 claude.vendor.probe --via $VIA --timeout $TIMEOUT"
set +e
answer="$(env "${ENV_ARGS[@]}" timeout "$TIMEOUT" claude -p --model haiku "reply with exactly: ok" 2>&1)"
status=$?
set -e

# report the vendor's text and the verdict
if [[ "$status" -eq 124 ]]; then
  echo "   ├─ exit = $status (timed out)"
else
  echo "   ├─ exit = $status"
fi
echo "   ├─ vendor said"
echo "   │  ├─"
echo "   │  │"
while IFS= read -r line; do echo "   │  │  $line"; done <<< "${answer:-(naught)}"
echo "   │  │"
echo "   │  └─"
echo "   │"
if [[ "$status" -eq 124 ]]; then
  echo "   └─ 💥 no answer in ${TIMEOUT}s; the cli hung"
  exit 1
fi
if [[ "$status" -ne 0 ]]; then
  echo "   └─ 💥 claude refused or failed; the text above names why"
  exit 1
fi
echo "   └─ ✨ claude answered"
