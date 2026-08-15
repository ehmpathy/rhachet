import { ConstraintError } from 'helpful-errors';

import { join } from 'node:path';

/**
 * .what = spawn the compiled rhachet cli through a real pty, in the background
 * .why =
 *   - the clone socket ONLY stands up when enroll runs on an interactive tty
 *     (isCloneSocketEligible = socketCapable ∧ interactive ∧ ¬noSocket). a plain
 *     spawnSync pipes stdio, so the child sees NO tty → no socket → the reach
 *     surface (say/get) cannot be proven end-to-end
 *   - so the reach clamp needs rhachet itself to run under a pty: this helper is
 *     the OUTER pty (test → rhachet), while genBrainCliPtyClone is the INNER pty
 *     (rhachet → brain). two ptys nested, the same topology a human's terminal
 *     wraps around an enrolled brain
 *   - background, because enroll blocks on the brain's lifetime; the test drives
 *     the reach verbs (say/get) from a SEPARATE process while this one stays live
 */
export interface RhachetBackgroundHandle {
  /** the pty child's pid */
  pid: number;
  /** all output the child has emitted so far (stdout+stderr merged, as a pty does) */
  getOutput: () => string;
  /** wait until the accumulated output matches a pattern, or reject on exit/timeout */
  waitForOutput: (input: {
    pattern: RegExp;
    timeoutMs?: number;
  }) => Promise<RegExpMatchArray>;
  /** write raw bytes into the child's input (the human's keystrokes) */
  write: (data: string) => void;
  /** kill the child and await its exit */
  kill: () => Promise<void>;
}

// the compiled binary this worktree's bin/run points at (self-linked)
const RHACHET_BIN = join(__dirname, '../../../bin/run');

/**
 * .what = spawn RHACHET_BIN with args through a pty; return a live handle
 * .why = gives a test a tty-backed rhachet it can watch, feed, and later kill
 */
export const spawnRhachetCliBackground = (input: {
  /** cli args after the binary name (e.g. ['enroll', 'claude', '--as', '@:driver']) */
  args: string[];
  /** cwd for the child */
  cwd: string;
  /** env vars merged over process.env; undefined values unset an inherited var */
  env?: Record<string, string | undefined>;
}): RhachetBackgroundHandle => {
  // lazy-require the native pty addon (the same seam genCloneOndisk loads it through)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pty = require('node-pty') as typeof import('node-pty');

  // merge env, dropping undefined so a test can unset an inherited var
  const mergedEnv = { ...process.env, ...input.env };
  const envFiltered = Object.fromEntries(
    Object.entries(mergedEnv).filter(([, v]) => v !== undefined),
  ) as { [key: string]: string };

  // spawn rhachet through the pty at a fixed geometry (deterministic wraps)
  const child = pty.spawn(RHACHET_BIN, input.args, {
    name: 'xterm-color',
    cols: 120,
    rows: 40,
    cwd: input.cwd,
    env: envFiltered,
  });

  // .note = deliberate mutation — a pty streams bytes over time, so the harness
  //   MUST accumulate them incrementally: `output` grows as data arrives and
  //   `exited` latches once on child exit. both are bounded to this closure and
  //   read only through getOutput()/waitForOutput(), never leaked, so the stream
  //   capture cannot be expressed as an immutable snapshot.
  let output = '';
  let exited: { code: number } | null = null;
  child.onData((data) => {
    output += data;
  });
  child.onExit(({ exitCode }) => {
    exited = { code: exitCode };
  });

  // poll the accumulated output for a pattern; reject on exit-before-match or timeout
  const waitForOutput = (waitInput: {
    pattern: RegExp;
    timeoutMs?: number;
  }): Promise<RegExpMatchArray> => {
    const timeoutMs = waitInput.timeoutMs ?? 15000;
    const startedAt = Date.now();
    return new Promise<RegExpMatchArray>((done, fail) => {
      const tick = (): void => {
        const match = output.match(waitInput.pattern);
        if (match) return done(match);
        if (exited)
          return fail(
            new ConstraintError(
              `rhachet exited (code ${exited.code}) before output matched ${String(
                waitInput.pattern,
              )}`,
              { exitCode: exited.code, pattern: String(waitInput.pattern), output },
            ),
          );
        if (Date.now() - startedAt > timeoutMs)
          return fail(
            new ConstraintError(
              `timed out after ${timeoutMs}ms for ${String(waitInput.pattern)}`,
              { timeoutMs, pattern: String(waitInput.pattern), output },
            ),
          );
        setTimeout(tick, 50);
      };
      tick();
    });
  };

  // kill the child, then await its exit (idempotent — a dead child is a no-op)
  const kill = async (): Promise<void> => {
    if (exited) return;
    child.kill();
    const startedAt = Date.now();
    while (!exited && Date.now() - startedAt < 5000) {
      await new Promise((r) => setTimeout(r, 25));
    }
  };

  return {
    pid: child.pid,
    getOutput: () => output,
    waitForOutput,
    write: (data) => child.write(data),
    kill,
  };
};
