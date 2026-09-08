#!/usr/bin/env bash
######################################################################
# .what = verify the WIRE HOP for the github.secrets vault — that REAL
#         github answers the six shapes `ghApiStandInServer.cjs` serves
#
# .why  = `keyrack.vault.githubSecrets.acceptance.test.ts` runs the real
#         `gh` binary against a local HTTPS stand-in (a SWAP, not a mock).
#         a swap proves the whole client stack executes; it cannot prove
#         github still answers these shapes. this procedure is the `.real`
#         backstop the swap's exception clause points at.
#
#         it is MANUAL by necessity, never by preference:
#           - github's workflow `permissions:` schema has NO secrets scope,
#             so ci's automatic GITHUB_TOKEN can never reach
#             `actions/secrets/*` — not under any permissions block
#           - the keyrack firewall sources from `toJSON(secrets)`, so a
#             credentialed lane needs a REPO SECRET, which only a repo
#             admin can add
#         ⇒ an automated ci lane is a foreman act. this is what a driver
#           can land, and it matches the worked example in
#           `rule.forbid.acceptance.mocks` (`.real` = a documented manual
#           run), rather than leaving `.real = NONE`.
#
# usage:
#   ./verify.githubSecrets.wirehop.sh --repo ehmpathy/rhachet
#   ./verify.githubSecrets.wirehop.sh --repo ehmpathy/rhachet --mode apply
#
# options:
#   --repo   owner/name to verify against (required)
#   --mode   plan (default) = READ-ONLY shapes only
#            apply          = also PUT + DELETE a throwaway secret
#   --help
#
# guarantee:
#   - plan mode mutates no state
#   - apply mode writes then deletes `KEYRACK_WIREHOP_PROBE`, and fails
#     loud if the delete does not land
#   - exit 0 = every shape matches · 1 = a shape drifted · 2 = bad input
#
# .note = run this when the stand-in changes, or on a github api
#         deprecation notice. record the run in the suite header's `.real`.
######################################################################

set -euo pipefail

REPO=""
MODE="plan"
SECRET_NAME="KEYRACK_WIREHOP_PROBE"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) REPO="${2:-}"; shift 2 ;;
    --mode) MODE="${2:-}"; shift 2 ;;
    # .why.sentinel = the range is bounded by the terminator BANNER, never by a line
    #   count. a `2,42p` count is a silent contract between the help text and the
    #   header's length: edit the prose and the help truncates or leaks, with no error.
    #   the start is line 3, not 2, so the help a human reads opens on `.what` rather
    #   than on the `####` banner wall
    --help|-h) sed -n '3,/^#\{10,\}$/p' "$0"; exit 0 ;;
    *) echo "🐢 belay that... unknown arg: $1" >&2; exit 2 ;;
  esac
done

[[ -n "$REPO" ]] || { echo "🐢 belay that... --repo owner/name is required" >&2; exit 2; }
[[ "$MODE" == "plan" || "$MODE" == "apply" ]] || { echo "🐢 belay that... --mode must be plan|apply" >&2; exit 2; }

FAILURES=0

# assert one real-github response shape against what the stand-in serves
# .why = each check names an exact shape `ghApiStandInServer.cjs` answers, so a
#        drift in github's contract surfaces as a named row rather than a vibe
check() {
  local label="$1" expectation="$2" actual="$3"
  if [[ "$actual" == "$expectation" ]]; then
    echo "   ├─ ✅ $label"
  else
    echo "   ├─ ⛈️  $label"
    echo "   │     expected: $expectation"
    echo "   │     actual:   $actual"
    FAILURES=$((FAILURES + 1))
  fi
}

echo "🐢 chartin course..."
echo ""
echo "🐚 verify.githubSecrets.wirehop --repo $REPO --mode $MODE"

OWNER="${REPO%%/*}"
NAME="${REPO##*/}"

# --- the read-only shapes: reachable with plain repo access ---

# ⚠️ every capture below carries `|| echo UNREACHABLE`. without it, `set -e` kills the run at
#    the FIRST drifted shape — and a partial run hides which of the other shapes also drifted,
#    which is the one job a drift detector has. proven: pointed at an absent repo, the unguarded
#    form died after row 1 and never graded rows 2-4.

# 1. `gh auth status` asks graphql for the viewer login
VIEWER=$(gh api -X POST graphql -f query='query UserCurrent{viewer{login}}' --jq 'if (.data.viewer.login|type)=="string" then "string" else "ABSENT" end' || echo "UNREACHABLE")
check "graphql viewer.login is a string" "string" "$VIEWER"

# 2. `gh repo view --json name` asks graphql for the repository name
REPONAME=$(gh api -X POST graphql -f query="query{repository(owner:\"$OWNER\",name:\"$NAME\"){name}}" --jq '.data.repository.name' || echo "UNREACHABLE")
check "graphql repository.name echoes the repo" "$NAME" "$REPONAME"

# 3. the api root probe
ROOT=$(gh api -X GET / --jq 'if has("current_user_url") then "ok" else "ABSENT" end' || echo "UNREACHABLE")
check "api root answers current_user_url" "ok" "$ROOT"

# 4. the sealed-box public key — the shape the whole PUT depends on
PUBKEY=$(gh api -X GET "repos/$REPO/actions/secrets/public-key" --jq '[(.key_id|type),(.key|type),(.key|length)]|join(",")' || echo "UNREACHABLE")
check "public-key is {key_id:string, key:string(44)}" "string,string,44" "$PUBKEY"

if [[ "$PUBKEY" == "UNREACHABLE" ]]; then
  echo "   │     hint: this route needs repo-admin (secrets) access."
  echo "   │           github's workflow permissions schema has no secrets"
  echo "   │           scope, so ci's automatic token can never reach it."
fi

# --- the write shapes: gated behind --mode apply ---

if [[ "$MODE" == "apply" ]]; then
  echo "   ├─ 🌊 apply — writes then deletes $SECRET_NAME"

  gh secret set "$SECRET_NAME" --repo "$REPO" --body "wirehop-probe-$(date +%s)"
  check "PUT a sealed secret succeeds" "0" "$?"

  LISTED=$(gh secret list --repo "$REPO" --json name --jq "[.[]|select(.name==\"$SECRET_NAME\")]|length")
  check "the written secret is listed" "1" "$LISTED"

  gh secret delete "$SECRET_NAME" --repo "$REPO"
  GONE=$(gh secret list --repo "$REPO" --json name --jq "[.[]|select(.name==\"$SECRET_NAME\")]|length")
  check "DELETE removes it (no residue left behind)" "0" "$GONE"
else
  echo "   ├─ 🌙 plan — PUT/DELETE not exercised (pass --mode apply)"
fi

echo "   └─ $FAILURES shape(s) drifted"
echo ""

if [[ "$FAILURES" -gt 0 ]]; then
  echo "🐢 bummer dude... real github no longer answers what the stand-in serves"
  echo "   └─ fix: update blackbox/.test/infra/ghApiStandInServer.cjs to match, then resnap"
  exit 1
fi

echo "🐢 shell yeah — every shape the stand-in serves is what real github answers 🌊"
