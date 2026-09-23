import { asPtyGeometry } from './asPtyGeometry';
import type { PtyCloneHost } from './genBrainCliPtyClone';

/**
 * .what = the PtyCloneHost for a DETACHED clone — one with no terminal to mirror
 * .why =
 *   - a clone enrolled with no tty has no human at its stream, so every wire the
 *     attached host opens is either useless (mirror, resize) or harmful (raw mode
 *     on a stdin nobody owns, an input pump that would forward the HOST process's
 *     bytes into a child no human sits at)
 *   - it is still a first-class clone: it takes a real pty and a real socket, so a
 *     peer reaches it by `say` and reads it by `get`. the screen feed is what makes
 *     that readable with no terminal in the loop, so the read channel this role
 *     ships is precisely what lets a clone exist unattended
 *
 * ⚠️ .note = the geometry is the FLOOR rather than a process read. a detached host
 *   has no winsize at all: `process.stdout.columns` is `undefined` when its stdout
 *   is a pipe and `0` on a tty whose size was never set. both are degenerate, and a
 *   `0` reaches the emulator as a real number, clamps to xterm's own 2x1 minimum,
 *   and leaves the clone unreadable for its whole life — every probe classifies
 *   `focus-unrecognized`, so every say is `withheld` (measured 2026-09-16). the
 *   floor is a DECLARED readable grid, never a guess at a terminal that is absent
 *
 * .note = `onSignal` is the one wire kept live. a detached clone must still die on
 *   a `SIGTERM` (that is how `clone prune` reaches it), so the forward stays; what
 *   is dropped is `SIGINT`, which belongs to a foreground terminal nobody holds
 */
export const genPtyCloneHostDetached = (input: {
  /**
   * where the child's output goes instead of a terminal
   *
   * 🔴 the caller normally DISCARDS it. a detached clone's screen has no live
   *   reader — `get` reads it off the screen feed, which taps the same pty data
   *   independently — so a sink here that writes to a real fd merely floods whoever
   *   inherited it (measured 2026-09-16 against stderr). the seam stays injected so
   *   a clamp can capture the mirror without a spy
   */
  writeOut: (data: string) => void;
}): PtyCloneHost => ({
  writeOut: input.writeOut,

  // no human is at the keyboard of a detached clone. the host process's own stdin
  // belongs to whoever spawned it, so to pump it in would inject foreign bytes
  onInput: () => () => undefined,

  size: () => asPtyGeometry({ cols: undefined, rows: undefined }),

  // a terminal that does not exist cannot be resized
  onResize: () => () => undefined,

  onSignal: (fn) => {
    const onTerm = (): void => fn('SIGTERM');
    process.on('SIGTERM', onTerm);
    return () => process.off('SIGTERM', onTerm);
  },

  // raw mode is a property of a tty. there is none, so there is naught to restore
  enterRawMode: () => () => undefined,
});
