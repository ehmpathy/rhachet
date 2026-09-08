import { matchesAnyMarker } from '@src/utils/matchesAnyMarker';

/**
 * .what = the shapes node-pty EMITS when the HOST refuses it a pty device
 *
 * 🚨 .why an allowlist, never a catch-all = the caller guards a whole block, and that
 *   block runs OUR code too — the socket bind (`genCloneSocketServer`, which can throw
 *   EADDRINUSE/EACCES), the host wires, the raw-mode enter. so a catch with no
 *   allowlist relabels our own defect as a host condition and tells the human
 *   `pass --no-socket`. that is loud about the WRONG PARTY — a caller-must-fix exit 2
 *   for a fault the caller cannot repair — which is the exact failhide
 *   `rule.forbid.failhide` forbids.
 *
 *   ⚠️ this is the SAME discipline `isPtyAddonLoadError` carries one file over, and for
 *   the same reason: **a marker counts only in the shape its emitter actually prints,
 *   never as a loose token.** a bare `/failed/` would match a socket-bind error, a
 *   TypeError's text, and node-pty's own `Usage: pty.fork(...)` arity complaint — and
 *   every one of those three is OURS to repair, not the host's.
 *
 * .note = the darwin/posix_spawn group all route through node-pty's own
 *   `format_error(func, errno)`, which prints `"<func> failed: <strerror>"` — so each
 *   marker anchors on the FUNC NAME plus ` failed`, never on the bare word.
 *
 * ⚠️ .note = `posix_spawn failed: No such file or directory` lands in this set although
 *   its true cause is an absent brain binary rather than an exhausted pty. it stays
 *   here deliberately: the CLASS is right (caller-must-fix, exit 2) and only the hint's
 *   phrase is imprecise, so to split it would widen this repair past the defect it
 *   answers. recorded rather than fixed.
 */
const PTY_DEVICE_REFUSED_MARKERS: RegExp[] = [
  // the linux/forkpty path — `pty.cc` throws these verbatim, with the `(3)` man-section
  // suffix that makes them unmistakable:
  //   `forkpty(3) failed.` · `openpty(3) failed.`
  /forkpty\(3\) failed/,
  /openpty\(3\) failed/,
  // the fd it just obtained could not be set to node-pty's own `nonblocking` mode — a
  // device-side refusal on that same allocation, for master and slave alike
  /Could not set (?:master|slave) fd to nonblocking/,
  // the darwin/posix_spawn path, each via `format_error`. one alternation, because the
  // func set is CLOSED in `pty.cc` and a per-row regex would only spread one fact
  /(?:posix_openpt|grantpt|unlockpt|open slave pty|tcsetattr|posix_spawn|posix_spawnattr_setflags|posix_spawnattr_setsigdefault|posix_spawnattr_setsigmask) failed:/,
  // the two ioctls on that same path, anchored to their request names so a bare
  // `ioctl(2) failed` from the RESIZE path (a different operation) cannot match
  /ioctl\((?:TIOCPTYGNAME|TIOCSWINSZ)\) failed:/,
  // the win32/conpty path — conpty could not be launched or its pipes stood up
  /Cannot launch conpty/,
  /Failed to initialize conpty con(?:in|out)/,
];

/**
 * .what = did the HOST refuse node-pty a pty device, or is this our own defect?
 * .why = decides the party. a device refusal is the caller's to work around
 *   (`--no-socket`, or free the host's ptys); every other throw out of the pty spawn
 *   block is a malfunction that must surface with its own stack intact
 */
export const isPtyDeviceRefusedError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : '';
  return matchesAnyMarker({
    markers: PTY_DEVICE_REFUSED_MARKERS,
    text: message,
  });
};
