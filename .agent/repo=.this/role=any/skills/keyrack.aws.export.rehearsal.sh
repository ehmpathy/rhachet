#!/usr/bin/env bash
######################################################################
# .what = a sandbox rehearsal: walk `rhx keyrack unlock` on an aws.config
#         key, under a fake aws cli, through every path the aws export
#         cache owns, and print what a human sees
#
# .why  = a real aws.config key needs an sso profile, and ehmpath has
#         none (its AWS_PROFILE sits in os.direct; `keyrack set --vault
#         aws.config` at its profile refuses as not an sso profile). so
#         the export path is otherwise only reached inside jest. this
#         builds the same scratch repo the acceptance suite builds, runs
#         the built cli in it, and prints each run's real output. it is
#         a rehearsal, not a dogfood: the aws cli here is the fake
#
# usage:
#   rhx keyrack.aws.export.rehearsal
#
# guarantee:
#   - the scratch repo, its HOME and its keyrack daemon live under
#     .temp/keyrack.aws.export.rehearsal/ (gitignored); the real HOME,
#     ~/.rhachet and the real daemon are never read or written
#   - the aws cli is the repo's fake (blackbox/.test/assets/mock-aws-cli)
#   - runs the built cli (bin/run, which loads dist/); build first
#   - walks: cold unlock, warm unlock, a burst of 3, a cli fault, a cache
#     dir fault; prints each output, exit code, and export count
#   - fails loud (exit 1) if a credential value the fake emits shows up in
#     any output, or if an export count is not what the cache promises
######################################################################

set -euo pipefail

# the dispatcher's own flags, recognized so any other arg stays a true refusal
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo|--role|--skill)
      shift 2
      ;;
    *)
      echo "keyrack.aws.export.rehearsal: unknown arg: $1" >&2
      echo "usage: keyrack.aws.export.rehearsal" >&2
      exit 2
      ;;
  esac
done

ROOT="$(git rev-parse --show-toplevel)"
RHX="$ROOT/bin/run"
MOCK_AWS_DIR="$ROOT/blackbox/.test/assets/mock-aws-cli"
SSH_KEY_DIR="$ROOT/src/.test/assets/keyrack/ssh"
SCRATCH="$ROOT/.temp/keyrack.aws.export.rehearsal/$(date -u +%Y%m%dT%H%M%SZ)"
CACHE_DIR="$SCRATCH/.rhachet/keyrack/cache/aws.export"
CALLS="$SCRATCH/.mock-aws-export-calls"

# the values the fake aws emits; none may reach a human
SECRET_VALUES=("AKIA_MOCK_ACCESS_KEY_123" "MockSecretAccessKey123456789" "MockSessionToken123456789012345678901234567890")

# fail fast if the cli is not built
if [[ ! -d "$ROOT/dist" ]]; then
  echo "✋ ConstraintError: dist/ is absent; bin/run loads it" >&2
  echo "   └─ hint: pnpm build, then retry" >&2
  exit 2
fi

# run the built cli in the scratch repo, under the scratch HOME and the fake aws
rhx_scratch() {
  env -i \
    HOME="$SCRATCH" \
    PATH="$MOCK_AWS_DIR:$PATH" \
    AWS_SDK_MOCK=1 \
    MOCK_AWS_IDENTITY=alice \
    MOCK_AWS_EXPORT_CALLS="$CALLS" \
    ${MOCK_AWS_EXPORT_MODE:+MOCK_AWS_EXPORT_MODE="$MOCK_AWS_EXPORT_MODE"} \
    bash -c 'cd "$1" && shift && exec "$@"' _ "$SCRATCH" "$RHX" "$@"
}

# count the exports the fake aws ran
get_export_count() {
  if [[ ! -f "$CALLS" ]]; then echo 0; return; fi
  grep -c . "$CALLS" || true
}

# fail loud if any output holds a credential value
assert_no_secret() {
  local text="$1"
  for value in "${SECRET_VALUES[@]}"; do
    if [[ "$text" == *"$value"* ]]; then
      echo "💥 MalfunctionError: a credential value reached the output" >&2
      exit 1
    fi
  done
}

# fail loud if the export count is not what the cache promises
assert_export_count() {
  local expected="$1" label="$2" actual
  actual="$(get_export_count)"
  if [[ "$actual" != "$expected" ]]; then
    echo "💥 MalfunctionError: $label ran $actual exports, expected $expected" >&2
    exit 1
  fi
}

# drop the daemon's grants and the export cache, so the next unlock meets the vault cold
set_cold_start() {
  rhx_scratch keyrack relock >/dev/null 2>&1 || true
  rm -rf "$CACHE_DIR"
}

# run one unlock, print what a human sees
walk_unlock() {
  local label="$1" out code
  set +e
  out="$(rhx_scratch keyrack unlock --env test --key AWS_PROFILE 2>&1)"
  code=$?
  set -e
  assert_no_secret "$out"
  echo "── $label · exit $code · exports so far = $(get_export_count)"
  printf '%s\n' "$out"
}

# git may not keep the fake aws's exec bit
chmod 755 "$MOCK_AWS_DIR/aws"

# build the scratch repo: git, ssh key, keyrack manifest, an sso profile, one aws.config key
mkdir -p "$SCRATCH/.ssh" "$SCRATCH/.agent" "$SCRATCH/.aws"
git -C "$SCRATCH" init -q
cp "$SSH_KEY_DIR/test_key_ed25519" "$SCRATCH/.ssh/id_ed25519"
cp "$SSH_KEY_DIR/test_key_ed25519.pub" "$SCRATCH/.ssh/id_ed25519.pub"
chmod 700 "$SCRATCH/.ssh"
chmod 600 "$SCRATCH/.ssh/id_ed25519"
rhx_scratch keyrack init >/dev/null
printf 'org: testorg\n\nenv.test:\n  - AWS_PROFILE\n' > "$SCRATCH/.agent/keyrack.yml"
cat > "$SCRATCH/.aws/config" <<'CONFIG'
[profile testorg.dev]
sso_session = testorg-sso
sso_account_id = 123456789012
sso_role_name = AdministratorAccess

[sso-session testorg-sso]
sso_start_url = https://d-12345abcde.awsapps.com/start
sso_region = us-east-1
CONFIG
rhx_scratch keyrack set --key AWS_PROFILE --env test --vault aws.config --exid testorg.dev >/dev/null
set_cold_start
rm -f "$CALLS"

echo "🐢 lets ride..."
echo ""
echo "🐚 keyrack.aws.export.rehearsal"
echo "   └─ scratch = ${SCRATCH#"$ROOT/"}"
echo ""

# path 1: cold unlock → one export, cache written owner-only
walk_unlock "path 1 · cold unlock"
assert_export_count 1 "a cold unlock"
echo "── cache modes · dir $(stat -c '%a' "$CACHE_DIR") · file $(stat -c '%a' "$CACHE_DIR"/*.json)"
echo ""

# path 2: warm unlock → no new export
walk_unlock "path 2 · warm unlock"
assert_export_count 1 "a warm unlock"
echo ""

# path 3: a burst of 3 at a cold cache → one export
set_cold_start
rm -f "$CALLS"
BURST_DIR="$SCRATCH/.burst"
mkdir -p "$BURST_DIR"
for n in 1 2 3; do
  ( set +e; rhx_scratch keyrack unlock --env test --key AWS_PROFILE >"$BURST_DIR/$n.out" 2>&1; echo $? >"$BURST_DIR/$n.code" ) &
done
wait
for n in 1 2 3; do
  assert_no_secret "$(cat "$BURST_DIR/$n.out")"
  echo "── path 3 · burst caller $n · exit $(cat "$BURST_DIR/$n.code")"
  cat "$BURST_DIR/$n.out"
done
assert_export_count 1 "a burst of 3"
echo "── path 3 · burst of 3 · exports = $(get_export_count)"
echo ""

# path 4: the cli faults → the row names a retry, no cache is written
set_cold_start
rm -f "$CALLS"
MOCK_AWS_EXPORT_MODE=fail walk_unlock "path 4 · cli fault"
if compgen -G "$CACHE_DIR/*.json" >/dev/null; then
  echo "💥 MalfunctionError: a failed export left a cache file" >&2
  exit 1
fi
echo "── path 4 · cache files after the fault = 0"
echo ""

# path 5: a file sits at the cache dir path → the row names the path to fix, no export runs
set_cold_start
rm -f "$CALLS"
mkdir -p "$(dirname "$CACHE_DIR")"
touch "$CACHE_DIR"
walk_unlock "path 5 · cache dir fault"
assert_export_count 0 "a cache dir fault"
rm -f "$CACHE_DIR"

# release the scratch daemon's grants
rhx_scratch keyrack relock >/dev/null 2>&1 || true

echo ""
echo "🌊 every path walked; no credential value reached any output"
