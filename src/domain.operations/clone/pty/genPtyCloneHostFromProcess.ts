import { asPtyGeometry } from './asPtyGeometry';
import type { PtyCloneHost } from './genBrainCliPtyClone';

/**
 * .what = the prod PtyCloneHost — the real process's stdin/stdout + signals,
 *   wrapped so genBrainCliPtyClone streams the brain through the human's terminal
 * .why =
 *   - genBrainCliPtyClone takes its host as a seam (so a test drives a capture
 *     sink). this factory is the one place the real process globals are wired, so
 *     the clone op stays pure of `process` and a test never touches the real tty
 *   - each wire returns its own unsubscribe, so the clone restores the human's
 *     terminal cleanly on exit (raw-mode off, listeners removed)
 *
 * .note = raw mode is entered only on a real tty; a piped stdin has no setRawMode,
 *   so the restore is a safe no-op there
 * 🔴 .note = the mirror NEVER holds the loop. node writes a tty synchronously on linux, so a
 *   pane whose reader is still (a tmux server starved for cpu) held the whole daemon inside
 *   `write`: its socket went deaf and its stall watch fired (measured 2783ms of drift behind a
 *   reader held still for 3000ms). `enterAsyncMirror` makes the tty handle async while the
 *   clone is live, so a chunk the pane cannot take yet queues in order and the loop turns on;
 *   its release drains that queue before the exit is reported, within a bound, then makes the
 *   handle sync again
 */
export const genPtyCloneHostFromProcess = (): PtyCloneHost => ({
  writeOut: (data) => {
    process.stdout.write(data);
  },

  enterAsyncMirror: () => {
    setTtyStdoutSync({ sync: false });
    return () =>
      new Promise((settle) => {
        // a pane still frozen at exit must never hold the exit: settle at the bound, and
        //   leave the queue to the os (F5: the handle stays async on that path, since a
        //   sync handle would block on the frozen pane)
        const bound = setTimeout(settle, CLONE_MIRROR_FLUSH_BOUND_MS);
        process.stdout.write('', () => {
          clearTimeout(bound);
          setTtyStdoutSync({ sync: true });
          settle();
        });
      });
  },

  onInput: (fn) => {
    const listener = (chunk: Buffer): void => fn(chunk.toString('utf8'));
    process.stdin.on('data', listener);
    process.stdin.resume();
    return () => {
      process.stdin.off('data', listener);
      process.stdin.pause();
    };
  },

  // 🔴 clamped, never `?? 80`. a pipe reports `undefined`, which a nullish-coalesce catches —
  // but a tty whose winsize was never set reports `0`, which it does NOT. a `0` reaches the
  // pty and the emulator as a real number, xterm clamps to its own 2x1 minimum, and the clone
  // is then unreadable for its whole life: every probe classifies `focus-unrecognized` and
  // every say is `withheld`. measured 2026-09-16; the clamp is `asPtyGeometry`
  size: () =>
    asPtyGeometry({
      cols: process.stdout.columns,
      rows: process.stdout.rows,
    }),

  onResize: (fn) => {
    process.stdout.on('resize', fn);
    return () => process.stdout.off('resize', fn);
  },

  onSignal: (fn) => {
    const onInt = (): void => fn('SIGINT');
    const onTerm = (): void => fn('SIGTERM');
    process.on('SIGINT', onInt);
    process.on('SIGTERM', onTerm);
    return () => {
      process.off('SIGINT', onInt);
      process.off('SIGTERM', onTerm);
    };
  },

  enterRawMode: () => {
    const stdin = process.stdin;
    if (!stdin.isTTY || typeof stdin.setRawMode !== 'function')
      return () => undefined;
    stdin.setRawMode(true);
    return () => stdin.setRawMode(false);
  },
});

/**
 * .what = how long a clone's exit waits for its queued mirror chunks to reach the pane
 * .why = long enough for a busy pane to drain a final redraw; short enough that a pane frozen
 *   for good never holds the exit
 */
const CLONE_MIRROR_FLUSH_BOUND_MS = 2000;

/**
 * .what = set whether this process's stdout writes are sync, when it is a tty
 * .why = node makes every tty handle sync (`lib/tty.js`), and only the handle can undo it
 * .note = `_handle` is node's internal libuv stream handle: no public api reaches its
 *   `setBlocking`, which node itself calls. a cast at that one boundary; the removal path is a
 *   public async tty mode in node. a stdout that is not a tty is left as is
 */
const setTtyStdoutSync = (input: { sync: boolean }): void => {
  if (!process.stdout.isTTY) return;
  const handle = (
    process.stdout as unknown as {
      _handle?: { setBlocking?: (sync: boolean) => number };
    }
  )._handle;
  handle?.setBlocking?.(input.sync);
};
