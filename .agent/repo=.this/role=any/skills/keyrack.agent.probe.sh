#!/usr/bin/env bash
######################################################################
# .what = probe ssh-agent sign-as-kdf determinism + per-owner isolation
#
# .why  = prove the keyrack identity-unlock approach BEFORE build:
#         - ed25519 agent signatures must be byte-identical
#           (deterministic) so sign-as-kdf can derive a stable wrap key
#         - a dedicated per-owner SSH_AUTH_SOCK must isolate one owner's
#           key from another owner's agent
#         - ssh-add -t must bound how long the agent holds the key
#
# usage:
#   rhx keyrack.agent.probe
#   rhx keyrack.agent.probe --owner ehmpath --owner2 foreman --ttl 1h
#
# guarantee:
#   - self-isolated: own agents, own sockets, own throwaway keys
#   - never touches the human's real ssh-agent or ~/.ssh keys
#   - cleans up spawned agents + temp dir on exit
######################################################################
set -uo pipefail

OWNER="ehmpath"
OWNER2="foreman"
TTL="5m"
EPHEMERAL=0
ASKPASS_MODE="inline"
# a value flag needs its $2 — a bare `--owner` (no value) would else set an empty
# owner and shift-consume the next arg, a silent mis-parse in an otherwise fail-fast
# surface. `fail` is defined further down, so guard inline: ⛈️ + exit 2 (caller-fixable)
need_val() { [ "$1" -ge 2 ] || { echo "⛈️  $2 requires a value" >&2; exit 2; }; }
while [ $# -gt 0 ]; do
  case "$1" in
    --owner)       need_val "$#" "$1"; OWNER="$2";  shift 2;;
    --owner2)      need_val "$#" "$1"; OWNER2="$2"; shift 2;;
    --ttl)         need_val "$#" "$1"; TTL="$2";    shift 2;;
    --ephemeral)   EPHEMERAL=1; shift;;
    --askpass)     need_val "$#" "$1"; ASKPASS_MODE="$2"; shift 2;;
    -h|--help)
      # a curated usage block, NOT a dump of every '#' line (which would leak the
      # shebang + inline comments) — one deterministic help text, easy to read
      cat <<'USAGE'
keyrack.agent.probe — prove ssh-agent sign-as-kdf determinism + per-owner isolation

usage:
  rhx keyrack.agent.probe
  rhx keyrack.agent.probe --owner ehmpath --owner2 foreman --ttl 1h
  rhx keyrack.agent.probe --ephemeral

flags:
  --owner <name>    first probe owner        (default: ehmpath)
  --owner2 <name>   second probe owner        (default: foreman)
  --ttl <dur>       agent key ttl             (default: 5m)
  --askpass <mode>  askpass mode for --ephemeral ONLY: native | inline
                    (default: inline; the default probe always feeds inline)
  --ephemeral       prove per-invocation teardown (zero reuse)
  -h, --help        show this help and exit

guarantee:
  - self-isolated: own agents, own sockets, own throwaway keys
  - never touches the human's real ssh-agent or ~/.ssh keys
  - cleans up spawned agents + temp dir on exit
USAGE
      exit 0;;
    # framework flags (--skill/--repo/--role) + any stray arg: ignore
    *) shift;;
  esac
done

# short temp dir (unix socket paths cap at ~104 chars)
WORK="$(mktemp -d -t kr-agent-probe.XXXXXX)"
PASS="probe-pass-123"
CHALLENGE="keyrack-unlock-v1:probe-manifest"

# bound every NON-interactive child process so a wedged binary (a hung keygen, a
# stuck agent spawn, an unresponsive sign) can never block the probe forever —
# matches the codebase convention (getOneAgentSignature 30s, genEphemeralSshAgent
# 10s). `run_bounded` prefixes `timeout`, but ONLY where no human input is awaited.
# the two INTERACTIVE ssh-add calls (the tty passphrase prompt, the gnome dialog)
# are deliberately left UNBOUNDED: a timeout mid-passphrase-entry would itself be a
# behavior hazard, it would cut the human off as they type. those two carry their
# own note at the call site. `timeout` is coreutils (present where openssh is)
BOUND_SECONDS=30
run_bounded() { timeout "$BOUND_SECONDS" "$@"; }

# askpass feeds the passphrase to ssh-add (probe only; never a prod pattern)
ASKPASS="$WORK/askpass"
printf '#!/bin/sh\necho %s\n' "$PASS" > "$ASKPASS"
chmod +x "$ASKPASS"

AGENT1_PID=""; AGENT2_PID=""
cleanup() {
  # kill each spawned agent, if any. no stderr swallow: a genuine cleanup fault
  # (e.g. a permission error) surfaces loud rather than hide (rule.forbid.failhide).
  # in a normal run both agents are still alive here, so kill succeeds silently;
  # only an already-abnormal state would print, which is exactly what we want seen
  [ -n "$AGENT1_PID" ] && kill "$AGENT1_PID"
  [ -n "$AGENT2_PID" ] && kill "$AGENT2_PID"
  rm -rf "$WORK"
}
trap cleanup EXIT

# fail with a semantic exit code (rule.require.exit-code-semantics):
#   2 = constraint — the caller must fix it (install a binary, retype the
#       passphrase, correct a flag). retry alone will not help.
#   1 = malfunction — the probed mechanism itself broke (e.g. a sign that
#       should have worked did not, or the reuse window stayed open).
# defaults to 2, since most probe stops are caller-fixable env prerequisites.
# pass an explicit 1 at a call site where a CONFIRMED-present binary then fails.
fail() { echo "⛈️  $1" >&2; exit "${2:-2}"; }

# preflight: the probe needs the openssh binaries. an ABSENT binary is caller-
# fixable (install it) → exit 2 with the exact fix. once confirmed present, a
# binary that fails mid-probe is a genuine malfunction (exit 1 at its call site),
# so the two never blur (rule.require.exit-code-semantics + friction-hazards).
for bin in ssh-keygen ssh-agent ssh-add; do
  command -v "$bin" >/dev/null 2>&1 || fail \
    "$bin not found — the probe needs openssh. fix: sudo apt install openssh-client" 2
done

# preflight the GNU coreutils the probe leans on too: every bounded child runs
# under `timeout` (run_bounded), the headless ssh-add path runs `setsid -w`, and the
# sig-digest echoes run `sha256sum`. all three ship with linux coreutils but are
# ABSENT on a stock BSD/macOS host (which has openssh yet not GNU coreutils) — so
# preflight them with the brew fix, else the first such call raw-fails with 'command
# not found'. note: `brew install coreutils` puts `gsha256sum`/`gtimeout` on PATH; a
# plain `sha256sum`/`timeout` needs the formula's gnubin PATH (or `brew install
# coreutils util-linux` + the gnubin export), which this fix message names.
for bin in timeout setsid sha256sum; do
  command -v "$bin" >/dev/null 2>&1 || fail \
    "$bin not found — the probe needs GNU coreutils. fix (macos): brew install coreutils util-linux (then add the gnubin PATH)" 2
done

# demo the ephemeral (per-invocation) unlock:
#   spawn a throwaway agent, load the key via the NATIVE prompt,
#   sign once (the unlock), kill the agent, then show a 2nd sign FAILS.
demo_ephemeral() {
  echo "🐢 keyrack ephemeral-agent demo — per-invocation unlock"
  echo "   owner=$OWNER  ttl=$TTL"
  echo

  # a passphrase-protected ed25519 key (stand-in for the owner's real key)
  run_bounded ssh-keygen -t ed25519 -N "$PASS" -f "$WORK/id_$OWNER" -C "probe-$OWNER" -q \
    || fail "ssh-keygen could not create the probe key (openssh present, op failed — check disk space + ~/.ssh permissions; re-run to see the raw stderr)" 1
  echo "🔑 made a passphrase-protected ed25519 key for $OWNER"
  echo "   (throwaway key — its passphrase is: $PASS)"
  echo

  # a throwaway agent, scoped to THIS process, socket in the 0700 temp dir
  local esock="$WORK/ephemeral.$OWNER.sock"
  eval "$(run_bounded ssh-agent -a "$esock" -s)" >/dev/null \
    || fail "ssh-agent could not spawn (openssh present, op failed — check disk space + ~/.ssh permissions; re-run to see the raw stderr)" 1
  AGENT1_PID="$SSH_AGENT_PID"
  echo "🧦 spawned a throwaway agent for this invocation only"
  echo "   SSH_AUTH_SOCK = $esock"
  echo "   pid           = $AGENT1_PID  (dies when this command exits)"
  echo

  # load the key — how we prompt depends on --askpass mode
  if [ "$ASKPASS_MODE" = "native" ]; then
    # the GUI popup needs an installed ssh-askpass dialog + a display.
    # fail-fast with the exact fix when no dialog is installed.
    # keyrack supports ONE askpass for now: the standalone gnome gtk dialog
    # (ssh-askpass-gnome → gnome-ssh-askpass). safe + official (part of openssh),
    # wayland-native, and it works standalone — unlike gcr-ssh-askpass (refuses a
    # direct run) and unlike x11-ssh-askpass (snoopable via XWayland).
    ASKBIN="$(command -v gnome-ssh-askpass || true)"
    if [ -z "$ASKBIN" ]; then
      for c in /usr/lib/openssh/gnome-ssh-askpass \
               /usr/libexec/openssh/gnome-ssh-askpass \
               /usr/lib/ssh/gnome-ssh-askpass; do
        [ -x "$c" ] && { ASKBIN="$c"; break; }
      done
    fi
    if [ -z "$ASKBIN" ]; then
      echo "⛈️  ssh-askpass-gnome is not installed — the GUI popup can not appear." >&2
      echo "   fix: install it (safe, official openssh package), then re-run:" >&2
      echo "     ! sudo apt install ssh-askpass-gnome" >&2
      echo "     ! rhx keyrack.agent.probe --ephemeral --askpass native" >&2
      echo "   or use the terminal prompt instead (no install needed):" >&2
      echo "     ! rhx keyrack.agent.probe --ephemeral" >&2
      exit 2
    fi
    ASKREAL="$(readlink -f "$ASKBIN" 2>/dev/null || echo "$ASKBIN")"
    echo "🔐 load the key — force the GUI askpass dialog:"
    echo "   askpass = $ASKBIN"
    echo "   real    = $ASKREAL"
    echo "   kind    = $(file -b "$ASKBIN" 2>/dev/null || echo unknown)"
    echo "   display = DISPLAY=${DISPLAY:-<unset>}  WAYLAND_DISPLAY=${WAYLAND_DISPLAY:-<unset>}  session=${XDG_SESSION_TYPE:-<unset>}"
    echo "   👉 type this passphrase in the popup:  $PASS"
    # do NOT override DISPLAY — use the session's real one; force askpass, no tty fallback.
    # deliberately UNBOUNDED (no run_bounded): this waits on the human at the gnome
    # dialog — a timeout would cut them off mid-passphrase-entry (a behavior hazard)
    if SSH_AUTH_SOCK="$esock" SSH_ASKPASS="$ASKBIN" SSH_ASKPASS_REQUIRE=force \
         ssh-add -t "$TTL" "$WORK/id_$OWNER" </dev/null; then
      echo "🔒 loaded via the GUI dialog"
    else
      echo "⛈️  the GUI askpass did not complete the load." >&2
      echo "   likely cause: the askpass at $ASKBIN could not open on this session" >&2
      echo "   (DISPLAY=${DISPLAY:-<unset>}, WAYLAND_DISPLAY=${WAYLAND_DISPLAY:-<unset>})." >&2
      echo "   note: force mode does NOT fall back to the tty — a cli prompt you saw" >&2
      echo "   came from a different run (plain --ephemeral)." >&2
      fail "askpass load failed — see the cause above: the dialog at $ASKBIN could not open on this session (check DISPLAY/WAYLAND_DISPLAY) or the passphrase was wrong"
    fi
  elif [ -t 0 ]; then
    echo "🔐 load the key — the native passphrase prompt is next:"
    echo "   👉 type this passphrase when asked:  $PASS"
    echo
    # deliberately UNBOUNDED (no run_bounded): this waits on the human typing the
    # passphrase at the tty — a timeout would cut them off mid-entry (a behavior hazard)
    SSH_AUTH_SOCK="$esock" ssh-add -t "$TTL" "$WORK/id_$OWNER" \
      || fail "ssh-add failed — did the passphrase match?"
  else
    echo "🔐 load the key — headless run, so the passphrase is auto-fed"
    echo "   (on a real terminal you would SEE the native prompt here —"
    echo "    run:  ! rhx keyrack.agent.probe --ephemeral)"
    # bounded: no human awaited (the passphrase is auto-fed via the askpass helper)
    SSH_AUTH_SOCK="$esock" SSH_ASKPASS="$ASKPASS" SSH_ASKPASS_REQUIRE=force DISPLAY=:0 \
      run_bounded setsid -w ssh-add -t "$TTL" "$WORK/id_$OWNER" </dev/null \
      || fail "ssh-add could not load the auto-fed key (openssh present, op failed — check disk space + ~/.ssh permissions; re-run to see the raw stderr)" 1
  fi
  echo "🔒 loaded, lifetime capped at $TTL"
  echo

  # move the key file away so ONLY the agent can produce a signature
  mv "$WORK/id_$OWNER" "$WORK/id_$OWNER.away"

  # sign once via the agent — this stands in for the manifest unlock
  printf '%s' "$CHALLENGE" > "$WORK/c1.txt"
  SSH_AUTH_SOCK="$esock" run_bounded ssh-keygen -Y sign -n keyrack-unlock \
    -f "$WORK/id_$OWNER.pub" "$WORK/c1.txt" >/dev/null 2>"$WORK/e1" \
    || { sed 's/^/     /' "$WORK/e1"; fail "agent sign failed — the loaded key did not produce a signature via ssh-keygen -Y sign (see stderr above); the sign-as-kdf path needs a functional agent sign" 1; }
  echo "✅ signed via the agent — the manifest would unlock right here"
  echo "   sig sha256 = $(sha256sum "$WORK/c1.txt.sig" | cut -d' ' -f1)"
  echo

  # kill the agent NOW — mimics teardown on process exit. no stderr swallow: the
  # agent is alive here, so kill succeeds silently; a real fault surfaces loud
  # (rule.forbid.failhide)
  kill "$AGENT1_PID"
  AGENT1_PID=""
  echo "🌊 agent killed — as it would be the moment the command exits"
  echo

  # attempt a 2nd sign — it MUST fail, which shows no reuse window remains
  printf '%s' "$CHALLENGE" > "$WORK/c2.txt"
  if SSH_AUTH_SOCK="$esock" run_bounded ssh-keygen -Y sign -n keyrack-unlock \
       -f "$WORK/id_$OWNER.pub" "$WORK/c2.txt" >/dev/null 2>&1; then
    rm -f "$WORK/c2.txt.sig"
    fail "LEAK — a 2nd sign succeeded after teardown (reuse window is open)" 1
  fi
  echo "✅ a 2nd sign FAILED — the unlocked key is gone with the process"
  echo "   => zero reuse window: the unlock held for that one invocation only 🐢"
  echo

  echo "🌴 verdict"
  echo "   ├─ native prompt  = shown once, on your terminal, this invocation"
  echo "   ├─ agent gone     = key + socket die with the process on exit"
  echo "   └─ no reuse       = a later sign can NOT reuse the unlocked key"
  echo "🐢 done."
}

# map aliases + validate the askpass mode — fail loud on a typo, never drop to tty.
# note: ASKPASS_MODE only steers the --ephemeral demo (below). the default probe
# (steps 1–6) always auto-feeds the passphrase inline, so it ignores this mode.
case "$ASKPASS_MODE" in
  native|gui|popup|dialog) ASKPASS_MODE="native";;
  inline|tty|terminal)     ASKPASS_MODE="inline";;
  *) fail "unknown --askpass '$ASKPASS_MODE' — use: native | inline";;
esac

# ephemeral mode: run the per-invocation demo, then exit
if [ "$EPHEMERAL" = "1" ]; then
  demo_ephemeral
  exit 0
fi

echo "🐢 keyrack ssh-agent probe"
echo "   owner=$OWNER  owner2=$OWNER2  ttl=$TTL"
echo

# 1. a passphrase-protected ed25519 key (stand-in for the owner's real key)
run_bounded ssh-keygen -t ed25519 -N "$PASS" -f "$WORK/id_$OWNER" -C "probe-$OWNER" -q \
  || fail "ssh-keygen failed (openssh present, op failed — check disk space + ~/.ssh permissions; re-run to see the raw stderr)" 1
echo "🔑 made a passphrase-protected ed25519 key for $OWNER"

# 2. a dedicated per-owner agent at a per-owner socket
SOCK1="$WORK/a.$OWNER.sock"
eval "$(run_bounded ssh-agent -a "$SOCK1" -s)" >/dev/null \
  || fail "ssh-agent could not spawn (openssh present, op failed — check disk space + ~/.ssh permissions; re-run to see the raw stderr)" 1
AGENT1_PID="$SSH_AGENT_PID"
echo "🧦 spawned a dedicated agent for $OWNER"
echo "   SSH_AUTH_SOCK = $SOCK1"

# 3. load the key with a bounded lifetime (-t = the cache knob). bounded: the
# passphrase is auto-fed via the askpass helper, so no human is awaited here
SSH_ASKPASS="$ASKPASS" SSH_ASKPASS_REQUIRE=force DISPLAY=:0 \
  run_bounded setsid -w ssh-add -t "$TTL" "$WORK/id_$OWNER" </dev/null \
  || fail "ssh-add could not load the auto-fed key (openssh present, op failed — check disk space + ~/.ssh permissions; re-run to see the raw stderr)" 1
echo "🔒 loaded the key, lifetime capped at $TTL:"
SSH_AUTH_SOCK="$SOCK1" run_bounded ssh-add -l | sed 's/^/     /'
echo

# 4. move the private key away, so ONLY the agent can produce a signature
mv "$WORK/id_$OWNER" "$WORK/id_$OWNER.away"

# 5. sign the same fixed challenge TWICE via the agent, then compare
printf '%s' "$CHALLENGE" > "$WORK/challenge.txt"
agent_sign() { # $1 = output path
  cp "$WORK/challenge.txt" "$WORK/c.txt"
  SSH_AUTH_SOCK="$SOCK1" run_bounded ssh-keygen -Y sign -n keyrack-unlock \
    -f "$WORK/id_$OWNER.pub" "$WORK/c.txt" >/dev/null 2>"$WORK/sign.err" \
    || { echo "     (ssh-keygen -Y sign stderr:)"; sed 's/^/       /' "$WORK/sign.err"; fail "agent sign failed — -Y sign may not route to the agent here" 1; }
  mv "$WORK/c.txt.sig" "$1"
}
agent_sign "$WORK/sig1"
agent_sign "$WORK/sig2"

echo "🔬 determinism — sign the same challenge twice via the agent:"
if diff -q "$WORK/sig1" "$WORK/sig2" >/dev/null; then
  echo "   ✅ DETERMINISTIC — the two agent signatures are byte-identical"
  echo "      => sign-as-kdf yields a stable wrap key. shell yeah 🌊"
else
  echo "   ⛈️  NON-DETERMINISTIC — the signatures differ"
  echo "      => sign-as-kdf would NOT work for this key/agent"
  echo "      sig1 = $(sha256sum "$WORK/sig1" | cut -d' ' -f1)"
  echo "      sig2 = $(sha256sum "$WORK/sig2" | cut -d' ' -f1)"
fi
echo "   sig sha256 = $(sha256sum "$WORK/sig1" | cut -d' ' -f1)"
echo

# 6. isolation — a SECOND owner's agent must NOT hold owner1's key
SOCK2="$WORK/a.$OWNER2.sock"
eval "$(run_bounded ssh-agent -a "$SOCK2" -s)" >/dev/null \
  || fail "ssh-agent (owner2) could not spawn (openssh present, op failed — check disk space + ~/.ssh permissions; re-run to see the raw stderr)" 1
AGENT2_PID="$SSH_AGENT_PID"
echo "🧦 spawned a dedicated agent for $OWNER2 (separate socket, no key added)"
if SSH_AUTH_SOCK="$SOCK2" run_bounded ssh-keygen -Y sign -n keyrack-unlock \
     -f "$WORK/id_$OWNER.pub" "$WORK/challenge.txt" >/dev/null 2>&1; then
  rm -f "$WORK/challenge.txt.sig"
  echo "   ⛈️  LEAK — $OWNER2's agent signed with $OWNER's key (isolation FAILED)"
else
  echo "   ✅ ISOLATED — $OWNER2's agent can NOT sign with $OWNER's key"
  echo "      => a per-owner SSH_AUTH_SOCK cleanly separates owners 🐢"
fi
echo

echo "🌴 verdict"
echo "   ├─ determinism  = the crux for sign-as-kdf (wrap key stability)"
echo "   ├─ per-owner sock = one --owner can not sign for another"
echo "   └─ ssh-add -t    = the cache lifetime knob (here: $TTL)"
echo "🐢 done."
