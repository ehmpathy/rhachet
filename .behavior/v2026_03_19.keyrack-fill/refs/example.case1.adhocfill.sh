#!/usr/bin/env bash
######################################################################
# .what = fill keyrack with required credentials for this repo
#
# .why  = enables ehmpath clones to supply credentials to integration
#         tests from their terminals
#
# usage:
#   ./.agent/repo=.this/role=any/skills/keyrack.fill.sh --env test
#   ./.agent/repo=.this/role=any/skills/keyrack.fill.sh --env prod
#   ./.agent/repo=.this/role=any/skills/keyrack.fill.sh --env test --refresh SQUARESPACE_PASSWORD
#   ./.agent/repo=.this/role=any/skills/keyrack.fill.sh --env test --refresh @all
#
# prereq:
#   npx rhachet roles init --repo ehmpathy --role mechanic --init keyrack.ehmpath
#
# guarantee:
#   - idempotent (safe to rerun)
#   - uses ehmpath owner keyrack
#   - stores in os secure vault
#   - fail-fast on errors
######################################################################

set -euo pipefail

# fail loud: print what failed
trap 'echo "error: keyrack.fill.sh failed at line $LINENO" >&2' ERR

# parse arguments
REFRESH_KEY=""
ENV=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --env)
      ENV="$2"
      shift 2
      ;;
    --refresh)
      REFRESH_KEY="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# require --env
if [[ -z "$ENV" ]]; then
  echo "error: --env required (test | prod)" >&2
  echo "" >&2
  echo "usage:" >&2
  echo "  ./.agent/repo=.this/role=any/skills/keyrack.fill.sh --env test" >&2
  echo "  ./.agent/repo=.this/role=any/skills/keyrack.fill.sh --env prod" >&2
  exit 1
fi

# validate --env value
if [[ "$ENV" != "test" && "$ENV" != "prod" ]]; then
  echo "error: --env must be 'test' or 'prod', got '$ENV'" >&2
  exit 1
fi

EHMPATH_KEY="$HOME/.ssh/ehmpath"
KEYRACK_HOST_MANIFEST="$HOME/.rhachet/keyrack/keyrack.host.ehmpath.age"

echo "fill keyrack for declastruct-squarespace..."

######################################################################
# step 1: verify ehmpath prikey exists
######################################################################
if [[ ! -f "$EHMPATH_KEY" ]]; then
  echo "   error: ehmpath prikey not found at $EHMPATH_KEY" >&2
  echo "" >&2
  echo "   run first:" >&2
  echo "     npx rhachet roles init --repo ehmpathy --role mechanic --init keyrack.ehmpath" >&2
  exit 1
fi
echo "   ehmpath prikey: found"

######################################################################
# step 2: verify ehmpath keyrack exists
######################################################################
if [[ ! -f "$KEYRACK_HOST_MANIFEST" ]]; then
  echo "   error: ehmpath keyrack not found at $KEYRACK_HOST_MANIFEST" >&2
  echo "" >&2
  echo "   run first:" >&2
  echo "     npx rhachet roles init --repo ehmpathy --role mechanic --init keyrack.ehmpath" >&2
  exit 1
fi
echo "   ehmpath keyrack: found"

######################################################################
# step 3: configure required keys for $ENV env
######################################################################
REQUIRED_KEYS=(
  "SQUARESPACE_EMAIL"
  "SQUARESPACE_PASSWORD"
  "SQUARESPACE_TOTP_SECRET"
)

echo ""
if [[ "$ENV" == "test" ]]; then
  echo "   note: each key will be prompted twice"
  echo "         1. your keyrack (for local dev)"
  echo "         2. ehmpath keyrack (for agent clones)"
else
  echo "   note: prod keys are stored in your keyrack only"
  echo "         (agents do not have prod access)"
fi
echo ""

for KEY in "${REQUIRED_KEYS[@]}"; do
  # skip "already configured" if this is the refresh target (or @all)
  SHOULD_REFRESH=false
  if [[ "$REFRESH_KEY" == "@all" || "$REFRESH_KEY" == "$KEY" ]]; then
    SHOULD_REFRESH=true
  fi

  # check if key is already configured in user's keyrack
  USER_GET_EXIT=0
  npx rhx keyrack get \
    --key "$KEY" \
    --env "$ENV" </dev/null >/dev/null 2>&1 || USER_GET_EXIT=$?

  # check if key is already configured in ehmpath keyrack (test env only)
  EHMPATH_GET_EXIT=0
  if [[ "$ENV" == "test" ]]; then
    # unlock ehmpath keyrack first (requires prikey)
    npx rhx keyrack unlock \
      --owner ehmpath \
      --prikey "$EHMPATH_KEY" \
      --key "$KEY" \
      --env "$ENV" </dev/null >/dev/null 2>&1 || true

    npx rhx keyrack get \
      --owner ehmpath \
      --key "$KEY" \
      --env "$ENV" </dev/null >/dev/null 2>&1 || EHMPATH_GET_EXIT=$?
  fi

  # for test: both must be configured; for prod: only user's keyrack
  if [[ "$ENV" == "test" ]]; then
    ALL_CONFIGURED=$([[ $USER_GET_EXIT -eq 0 && $EHMPATH_GET_EXIT -eq 0 ]] && echo "true" || echo "false")
  else
    ALL_CONFIGURED=$([[ $USER_GET_EXIT -eq 0 ]] && echo "true" || echo "false")
  fi

  if [[ "$ALL_CONFIGURED" == "true" && "$SHOULD_REFRESH" == "false" ]]; then
    echo "   key $KEY: configured"
  else
    if [[ "$SHOULD_REFRESH" == "true" ]]; then
      echo "   key $KEY: refresh..."
    else
      echo "   key $KEY: configure..."
    fi

    # set in user's keyrack (if needed or refresh)
    if [[ $USER_GET_EXIT -ne 0 || "$SHOULD_REFRESH" == "true" ]]; then
      echo "      [1/2] your keyrack:"
      npx rhx keyrack set \
        --key "$KEY" \
        --env "$ENV" \
        --vault os.secure

      # reload user's key into daemon
      npx rhx keyrack relock \
        --key "$KEY" </dev/null >/dev/null 2>&1 || true
      npx rhx keyrack unlock \
        --key "$KEY" \
        --env "$ENV" </dev/null >/dev/null 2>&1 || true
    fi

    # set in ehmpath keyrack (test env only)
    if [[ "$ENV" == "test" ]]; then
      if [[ $EHMPATH_GET_EXIT -ne 0 || "$SHOULD_REFRESH" == "true" ]]; then
        echo "      [2/2] ehmpath keyrack:"
        npx rhx keyrack set \
          --owner ehmpath \
          --prikey "$EHMPATH_KEY" \
          --key "$KEY" \
          --env "$ENV" \
          --vault os.secure
      fi

      # reload ehmpath key into daemon
      npx rhx keyrack relock \
        --owner ehmpath \
        --key "$KEY" </dev/null >/dev/null 2>&1 || true
      npx rhx keyrack unlock \
        --owner ehmpath \
        --prikey "$EHMPATH_KEY" \
        --key "$KEY" \
        --env "$ENV" </dev/null >/dev/null 2>&1 || true
    fi

    # verify keys can be fetched back (fail-fast, fail-loud)
    VERIFY_OUTPUT=""
    VERIFY_EXIT=0
    VERIFY_OUTPUT=$(npx rhx keyrack get \
      --key "$KEY" \
      --env "$ENV" </dev/null 2>&1) || VERIFY_EXIT=$?
    if [[ $VERIFY_EXIT -ne 0 ]]; then
      echo "   key $KEY: FAILED to verify in your keyrack (exit $VERIFY_EXIT)" >&2
      echo "$VERIFY_OUTPUT" >&2
      exit 1
    fi

    if [[ "$ENV" == "test" ]]; then
      # unlock ehmpath keyrack first (requires prikey)
      npx rhx keyrack unlock \
        --owner ehmpath \
        --prikey "$EHMPATH_KEY" \
        --key "$KEY" \
        --env "$ENV" </dev/null >/dev/null 2>&1 || true

      VERIFY_OUTPUT=""
      VERIFY_EXIT=0
      VERIFY_OUTPUT=$(npx rhx keyrack get \
        --owner ehmpath \
        --key "$KEY" \
        --env "$ENV" </dev/null 2>&1) || VERIFY_EXIT=$?
      if [[ $VERIFY_EXIT -ne 0 ]]; then
        echo "   key $KEY: FAILED to verify in ehmpath keyrack (exit $VERIFY_EXIT)" >&2
        echo "$VERIFY_OUTPUT" >&2
        exit 1
      fi
    fi

    echo "   key $KEY: configured"
  fi
done

echo ""
echo "keyrack filled for declastruct-squarespace"
echo ""
echo "verify with: npm run test:integration"

