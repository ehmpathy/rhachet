#!/usr/bin/env bash
######################################################################
# .what = walk the mod-fault critical paths by hand, against the built
#         cli, in a scratch repo, and print each command with its real
#         output and exit code
#
# .why  = a snapshot proves a shape; a walk proves the experience. a
#         reviewer (or a 5.3 self review) can run this once and read the
#         whole journey a human meets: a faulty mod never blocks init or
#         enroll, the boot names the fault and its fix, the stop pesters
#         until cured, two faults count apart, and a corrupt view record
#         at a hand boot skips the mod rather than refuse the boot
#
# usage:
#   rhx mods.walk
#
# options:
#   --help, -h   show this help
#
# guarantee:
#   - builds a scratch repo from blackbox/.test/assets/with-mods under
#     .temp/mods.walk/ (gitignored), with a stub `claude` on PATH, so no
#     real brain spawns and the host repo is never touched
#   - runs this worktree's built cli (bin/run); run `pnpm run build` first
#   - prints `$ <command>`, its stdout + stderr, and `exit=<code>` per step
#   - exits 0 once the walk completes, whatever each step exits; the
#     exit codes ARE the evidence, printed for the reader to judge
######################################################################
set -euo pipefail

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h) awk 'NR > 2 && /^#/ { sub(/^# ?/, ""); print } /^set -euo/ { exit }' "$0" | grep -v '^#*$' || :; exit 0 ;;
    --skill|--repo|--role) shift 2 ;;
    *) echo "✋ ConstraintError: unknown option: $1" >&2; exit 2 ;;
  esac
done

REPO_ROOT="$(git rev-parse --show-toplevel)"
BIN="$REPO_ROOT/bin/run"
[[ -f "$REPO_ROOT/dist/.build.stamp" ]] || {
  echo "✋ ConstraintError: the cli is not built" >&2
  echo "   └─ fix = pnpm run build" >&2
  exit 2
}

# the scratch repo: the fixture, a git root of its own, a stub brain
WALK="$REPO_ROOT/.temp/mods.walk/$(date -u +%Y-%m-%dT%H-%M-%SZ)"
mkdir -p "$WALK"
cp -R "$REPO_ROOT/blackbox/.test/assets/with-mods/." "$WALK/"
git -C "$WALK" init -q
mkdir -p "$WALK/.stub-bin"
printf '#!/usr/bin/env bash\nif [ "$1" = "--version" ]; then echo "2.1.277 (Claude Code)"; fi\nexit 0\n' > "$WALK/.stub-bin/claude"
chmod 755 "$WALK/.stub-bin/claude"
export PATH="$WALK/.stub-bin:$PATH"
unset CLAUDE_CONFIG_DIR
# the walk is evidence, so its bytes must not hang on the caller's color env: a caller that sets
#   FORCE_COLOR (a jest worker, some ci) would paint the stop hold, a NO_COLOR one would not
export FORCE_COLOR=0 NO_COLOR=1

# two sound mods, each pinned to the installed version, so no drift holds the stop
MODS="$WALK/.agent/repo=.mods"
printf 'of: test/surfer@1.0.0\nbriefs:\n  say:\n    - briefs/rule.require.reef-etiquette.md\n  not:\n    - briefs/rule.forbid.wipeouts.md\n' > "$MODS/role=surfer/boot.yml"
mkdir -p "$MODS/role=lifeguard/briefs"
printf 'of: test/lifeguard@1.0.0\n' > "$MODS/role=lifeguard/boot.yml"
printf 'modded: whistle twice, then wave\n' > "$MODS/role=lifeguard/briefs/rule.require.whistle.md"

# run one step: print the command, its output, and its exit code
step() {
  local label="$1"; shift
  echo ""
  echo "── $label"
  echo "\$ rhx $*"
  local code=0
  # stderr joins stdout: the readout and the stop hold print there, and the walk is what a human sees
  ( cd "$WALK" && "$BIN" "$@" 2>&1 ) || code=$?
  echo "exit=$code"
}

# print the boot notices of each actor an enroll rendered, and whether its sound mod booted
# .note = an enroll of the whole linked set lands on the repo actor; any other roleset on a hash actor
show_boot_notices() {
  local label="$1"
  echo ""
  echo "── $label"
  shopt -s nullglob
  for boot in "$WALK"/.agent/.actors/actor.via.repo=ambient/brain/.claude/boot.md "$WALK"/.agent/.actors/actor.via.hash=*/brain/.claude/boot.md; do
    echo "\$ awk '/<mods?\\.skipped/,/<\\/mods?\\.skipped>/' ${boot#"$WALK/"}"
    awk '/<mods?\.skipped/,/<\/mods?\.skipped>/' "$boot"
    echo "\$ grep -c 'modded: whistle twice, then wave' ${boot#"$WALK/"}   # the sound lifeguard mod"
    grep -c 'modded: whistle twice, then wave' "$boot" || :
  done
  shopt -u nullglob
}

echo "🦉 the walk"
echo "   └─ scratch repo = ${WALK#"$REPO_ROOT/"}"

# path 1: a C4 fault (an unnamed mod file) beside a sound mod
printf 'a typo of a held path\n' > "$MODS/role=surfer/briefs/rule.require.surf-wux.md"
echo ""
echo "══ path 1 — a mod file no say or ref names (C4), beside a sound mod"
step "init with the fault in place" init --roles surfer lifeguard
step "enroll a clone of both roles" enroll claude --roles surfer,lifeguard
show_boot_notices "the boot the enroll rendered"
step "a session stops" roles cost --all --when hook.onStop

# path 2: a second fault, a mod dir with no boot.yml (C1)
rm "$MODS/role=lifeguard/boot.yml"
echo ""
echo "══ path 2 — a second fault, the lifeguard mod loses its boot.yml (C1)"
step "a session stops, two faults in the walk" roles cost --all --when hook.onStop

# path 3: cure one, then the other
rm "$MODS/role=surfer/briefs/rule.require.surf-wux.md"
echo ""
echo "══ path 3 — cure the C4 fault, then the C1 fault"
step "a session stops, the C4 cured" roles cost --all --when hook.onStop
printf 'of: test/lifeguard@1.0.0\n' > "$MODS/role=lifeguard/boot.yml"
step "a session stops, both cured" roles cost --all --when hook.onStop
step "enroll again, both cured" enroll claude --roles surfer,lifeguard

# path 4: a corrupt view record (C11) at a hand boot
printf '{ not json' > "$WALK/.agent/repo=test/role=surfer/.modded.json"
echo ""
echo "══ path 4 — a corrupt view record (C11), met by a hand roles boot"
echo ""
echo "── a hand boot of surfer (its notice block only)"
echo "\$ rhx roles boot --repo test --role surfer | awk '/<mod\\.skipped/,/<\\/mod\\.skipped>/'"
code=0
( cd "$WALK" && "$BIN" roles boot --repo test --role surfer ) > "$WALK/.boot.out" || code=$?
awk '/<mod\.skipped/,/<\/mod\.skipped>/' "$WALK/.boot.out"
echo "exit=$code"
# the cure the notice names, followed to the letter: delete the record, then re-link the role
echo ""
echo "── the printed fix, step 1 — delete the record"
echo "\$ rm .agent/repo=test/role=surfer/.modded.json"
rm "$WALK/.agent/repo=test/role=surfer/.modded.json"
step "the printed fix, step 2 — re-link the role" init --roles +test/surfer
echo ""
echo "── a hand boot of surfer, cured (its notice count, then a modded line)"
code=0
( cd "$WALK" && "$BIN" roles boot --repo test --role surfer ) > "$WALK/.boot.out" || code=$?
echo "\$ rhx roles boot --repo test --role surfer | grep -c '<mod.skipped'"
grep -c '<mod.skipped' "$WALK/.boot.out" || :
echo "\$ rhx roles boot --repo test --role surfer | grep -c 'mind the reef'"
grep -c 'mind the reef' "$WALK/.boot.out" || :
echo "exit=$code"
