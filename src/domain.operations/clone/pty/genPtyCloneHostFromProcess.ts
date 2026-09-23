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
 */
export const genPtyCloneHostFromProcess = (): PtyCloneHost => ({
  writeOut: (data) => process.stdout.write(data),

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
