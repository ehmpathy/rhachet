import { ConstraintError } from 'helpful-errors';

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { isCommandNotFoundError } from './isCommandNotFoundError';
import { SSH_PROBE_TIMEOUT_MS } from './sshExecTimeouts';

/**
 * .what = the package that provides the mandated gnome askpass dialog
 * .why  = surfaced in the fail-fast error so the human has the exact fix
 *
 * .note = the package name is the same across distros; only the package manager
 *         differs (apt/dnf/pacman), so the message names the package and lets the
 *         human reach for their own manager rather than assume apt/Debian
 */
const ASKPASS_INSTALL_PACKAGE = 'ssh-askpass-gnome';

/**
 * .what = locate the mandated gnome ssh-askpass dialog, or fail fast with the fix
 * .why  = the passphrase unlocks the key that unlocks the whole manifest, so it
 *         must be typed into a Wayland-native dialog, never the tty where a
 *         keylogger could capture it (vision q2). only `gnome-ssh-askpass` is
 *         supported for v1 — it is GTK, so the compositor isolates it; the x11
 *         variant is XWayland-snoopable and gcr's is private to gcr-ssh-agent
 *
 * .note = detection is over absolute install paths + a PATH lookup, so it is
 *         injectable for tests via `candidates`; a real dialog is never spawned
 * .note = absent → ConstraintError (exit 2, caller must fix) with a
 *         PLATFORM-AWARE fix; NEVER a silent drop to the tty prompt. on Linux
 *         the fix is the package install; off Linux the gnome dialog is not a
 *         native v1 feature, so the message names the platform and points at the
 *         KEYRACK_ASKPASS seam rather than an `apt` command that cannot run there
 *         (v1 targets the Linux/Wayland desktop per vision q2). `platform` is a
 *         test-only injection seam, like `candidates`; it never crosses the
 *         CLI (defaults to process.platform)
 */
export const getOneAskpassDialog = (input?: {
  candidates?: string[];
  platform?: NodeJS.Platform;
}): string => {
  // when KEYRACK_ASKPASS is set (and no in-process `candidates` injection
  // overrides it), it is AUTHORITATIVE: the operator named the exact dialog, so
  // it is the ONLY candidate. a present override is returned; an absent one fails
  // fast pointing back at that override — detection NEVER falls through to a host
  // dialog the operator did not ask for. this also makes absence hermetically
  // forceable: a blackbox test points the override at a nonexistent path and gets
  // the same fail-fast on any host, no matter what is installed there
  //
  // guard on `.length`, NOT mere presence: an empty `candidates: []` means "no
  // dialog injected" (the SAME read `withKeyrackWrapKeyViaAgent` uses), so it must
  // still honor the KEYRACK_ASKPASS override, not treat `[]` as an injection
  const override = input?.candidates?.length
    ? undefined
    : process.env.KEYRACK_ASKPASS;
  if (override) {
    if (existsSync(override)) return override;
    throw new ConstraintError(asAskpassOverrideAbsentMessage({ override }), {
      override,
      fix: `point KEYRACK_ASKPASS at a present askpass dialog, or unset it to auto-detect ${ASKPASS_INSTALL_PACKAGE}`,
    });
  }

  // again on `.length`: an empty `[]` is "not injected", so fall through to host
  // discovery rather than search an empty candidate set and fail-fast falsely
  const candidates = input?.candidates?.length
    ? input.candidates
    : getDefaultAskpassCandidates();

  const dialog = candidates.find((path) => existsSync(path));
  if (dialog) return dialog;

  // the fix depends on the platform: a package install on Linux, the
  // KEYRACK_ASKPASS seam elsewhere (an apt command is useless off Debian/Linux)
  const platform = input?.platform ?? process.platform;
  const onLinux = platform === 'linux';
  throw new ConstraintError(asAskpassAbsentMessage({ platform }), {
    candidates,
    platform,
    fix: onLinux
      ? `install ${ASKPASS_INSTALL_PACKAGE} with your package manager — e.g. apt: sudo apt install ${ASKPASS_INSTALL_PACKAGE} · dnf: sudo dnf install ${ASKPASS_INSTALL_PACKAGE} · pacman: sudo pacman -S ${ASKPASS_INSTALL_PACKAGE}`
      : 'set KEYRACK_ASKPASS to a gnome-compatible askpass dialog on your system',
  });
};

/**
 * .what = the standard gnome-ssh-askpass locations, then a PATH lookup as fallback
 * .why  = distros install the dialog at a few well-known spots; a PATH hit
 *         covers the rest without a guess
 *
 * .note = the verified absolute paths come FIRST, the PATH lookup LAST. this file's
 *         whole purpose is to keep the passphrase off an attacker-influenceable
 *         surface, and PATH is exactly that surface — a prepended malicious
 *         `gnome-ssh-askpass` earlier on PATH would otherwise be preferred over the
 *         known-good system dialog and could capture the passphrase. so a PATH hit
 *         is only ever a fallback for installs outside the three standard spots,
 *         never a preemption of them
 * .note = the KEYRACK_ASKPASS override is NOT folded in here — it is handled
 *         authoritatively by the caller (a set override is the ONLY candidate),
 *         so host discovery runs only when no override is set
 */
export const getDefaultAskpassCandidates = (input?: {
  // the PATH hit to append, injected so the candidate order is unit-testable
  // without a real `which` on the host; defaults to a live
  // `which gnome-ssh-askpass` lookup. `undefined` means "not injected → look it
  // up"; an explicit `null` means "no PATH hit" (mirrors the `candidates`/
  // `platform` seams on getOneAskpassDialog)
  onPath?: string | null;
}): string[] => {
  const standardPaths = [
    '/usr/lib/openssh/gnome-ssh-askpass',
    '/usr/libexec/openssh/gnome-ssh-askpass',
    '/usr/lib/ssh/gnome-ssh-askpass',
  ];

  // a PATH lookup covers installs outside the standard spots — appended LAST so the
  // verified absolute paths always win when both are present (PATH is attacker-shaped)
  const onPath =
    input?.onPath !== undefined
      ? input.onPath
      : whichOrNull('gnome-ssh-askpass');
  return onPath ? [...standardPaths, onPath] : standardPaths;
};

/**
 * .what = look up a command on PATH, or null if absent
 * .why  = `which` throws when absent; keyrack wants a value, not a throw
 *
 * .note = allowlists ONLY the expected "command not found" outcome (`which` ran
 *         and exited non-zero → `error.status` is a number). a genuine fault —
 *         `which` itself absent (ENOENT on spawn), a signal, a permission error
 *         — has no numeric `.status`, so it surfaces loud (rule.forbid.failhide)
 */
const whichOrNull = (command: string): string | null => {
  try {
    return execFileSync('which', [command], {
      encoding: 'utf8',
      stdio: 'pipe',
      // bound the probe: a wedged `which` must not hang the event loop
      timeout: SSH_PROBE_TIMEOUT_MS,
    }).trim();
  } catch (error) {
    if (isCommandNotFoundError(error)) return null;
    throw error;
  }
};

/**
 * .what = a human name for a node platform id, for the fail-fast message
 * .why  = `darwin`/`win32` are the node ids, not what a human calls their os;
 *         the fail-fast message names the platform so a macOS user is not told
 *         to run an `apt` command that does not exist on their machine
 */
const asPlatformName = (platform: NodeJS.Platform): string => {
  if (platform === 'darwin') return 'macOS';
  if (platform === 'win32') return 'Windows';
  if (platform === 'linux') return 'Linux';
  return platform;
};

/**
 * .what = the fail-fast message when KEYRACK_ASKPASS names a dialog that is absent
 * .why  = a set override is authoritative, so an absent one is the operator's own
 *         miswire — the message names the exact path they set and the two fixes
 *         (fix the path, or unset to auto-detect), never a generic "install a
 *         dialog" that would misdirect (errors-name-the-fix)
 */
const asAskpassOverrideAbsentMessage = (input: { override: string }): string =>
  [
    'KEYRACK_ASKPASS points at a passphrase dialog that does not exist',
    `   ├─ set to: ${input.override}`,
    '   ├─ why: KEYRACK_ASKPASS overrides dialog auto-detection, so keyrack uses',
    '   │       only that path — and nothing is there',
    `   └─ fix: point KEYRACK_ASKPASS at a real askpass dialog, or unset it to`,
    `           auto-detect ${ASKPASS_INSTALL_PACKAGE}`,
  ].join('\n');

/**
 * .what = the treestruct fail-fast message shown when no dialog is installed
 * .why  = names the why (keylogger mitigation) and a PLATFORM-AWARE fix, per the
 *         ergonomist errors-name-the-fix rule — a fix a human can actually run
 *         on the machine they are on
 *
 * .note = on Linux the dialog just needs a package install. off Linux the gnome
 *         dialog is not a native v1 feature (v1 targets the Linux/Wayland
 *         desktop, vision q2), so the message names the platform and points at
 *         the KEYRACK_ASKPASS seam — an `apt install` line would be a dead end
 *         on macOS/Windows, the very platforms that reach this branch
 */
const asAskpassAbsentMessage = (input: {
  platform: NodeJS.Platform;
}): string => {
  if (input.platform === 'linux')
    return [
      'keyrack needs a graphical passphrase dialog, and none is installed',
      '   ├─ why: the dialog keeps your passphrase off the terminal,',
      '   │       where a keylogger or compromised shell could capture it',
      `   ├─ fix: install ${ASKPASS_INSTALL_PACKAGE} with your package manager, then retry —`,
      `   │       ├─ apt (debian/ubuntu):  sudo apt install ${ASKPASS_INSTALL_PACKAGE}`,
      `   │       ├─ dnf (fedora/rhel):    sudo dnf install ${ASKPASS_INSTALL_PACKAGE}`,
      `   │       └─ pacman (arch):        sudo pacman -S ${ASKPASS_INSTALL_PACKAGE}`,
      '   └─ or: point KEYRACK_ASKPASS at your dialog if it is installed elsewhere',
    ].join('\n');

  return [
    `keyrack's graphical passphrase dialog is a Linux-desktop feature in v1, and this is ${asPlatformName(input.platform)}`,
    '   ├─ why: the dialog keeps your passphrase off the terminal, where a',
    '   │       keylogger could capture it — only the gnome dialog is wired',
    '   │       up for v1 (a Linux/Wayland target)',
    '   └─ fix: point KEYRACK_ASKPASS at a gnome-compatible askpass dialog on',
    '           your system, then retry (v1 ships no macOS/Windows-native dialog)',
  ].join('\n');
};
