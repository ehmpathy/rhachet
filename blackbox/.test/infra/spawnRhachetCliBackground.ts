import { ConstraintError } from 'helpful-errors';

import { join } from 'node:path';

/**
 * .what = the own-property `waitForExit` stamps on the error it raises when its bound expires
 *
 * 🚨 .why a MARK and not the error CLASS = `kill` allowlists this one condition out of a
 *   teardown, and a class read allowlists a whole TYPE. `ConstraintError` is the vocabulary
 *   every guard in this harness reaches for, so a class match would absorb a future guard's
 *   unrelated throw into a one-line warn — the exact failhide the allowlist exists to avoid.
 *
 * ⚠️ .why an own property and not `instanceof` = the same realm-independence
 *   `isCloneSocketBindFaultError` records from a measured defect: under jest an `instanceof`
 *   answers false for exactly the errors it is asked to classify.
 */
const EXIT_TIMEOUT_MARK = 'rhachetBackgroundExitTimeout' as const;

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
  /**
   * wait for the child to exit and yield its code; rejects on timeout
   *
   * .why = a pty run that FAILS has its verdict in two places, and only one of them is
   *   on screen: the frame a human reads, and the semantic exit code a machine branches
   *   on (ConstraintError=2, MalfunctionError=1). a test that asserts only the text
   *   proves half a contract — and it is the half that cannot tell "the caller must
   *   amend" from "we must repair"
   */
  waitForExit: (input?: { timeoutMs?: number }) => Promise<number>;
  /** write raw bytes into the child's input (the human's keystrokes) */
  write: (data: string) => void;
  /**
   * kill the child and await its exit
   *
   * `{ exited: false }` says the child outlived the kill bound — a leaked pty and pid. the
   * teardown does not throw on it (a throw there would replace a real verdict with a cleanup
   * fault), so this flag is the only machine-readable trace of the leak
   */
  kill: () => Promise<{ exited: boolean }>;
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

  // 🚨 EVENT-DRIVEN, never a poll — `onData`/`onExit` fire exactly when the facts change,
  //   so a tick loop would burn the event loop and answer no sooner
  //   (`rule.forbid.behavior-hazards`). one set holds every waiter, and a waiter re-reads
  //   its OWN predicate when woken, so an event needs no knowledge of who wants what
  const waiters = new Set<() => void>();
  const notify = (): void => [...waiters].forEach((wake) => wake());

  child.onData((data) => {
    output += data;
    notify();
  });
  child.onExit(({ exitCode }) => {
    exited = { code: exitCode };
    notify();
  });

  /**
   * .what = settle once `read()` yields a value, or reject on the bound
   *
   * 🚨 the waiter is REGISTERED BEFORE its first read, and that sequence is the whole cure
   *   for a LOST WAKEUP: a check-then-park shape lets an event drain a list the caller has
   *   not joined yet, so the caller sits to its full bound and reports a spurious timeout.
   *
   * ⚠️ `finish` unregisters on EVERY exit path. an abandoned waiter would be woken by a
   *   later event and reject with nobody left to await it — an unhandled rejection that
   *   crashes the worker and masks the true verdict.
   *
   * ⚠️ `asTimeout` is typed `() => Error`, never `() => ConstraintError` — `HelpfulError`'s
   *   `metadata` getter is a conditional type over its generic, so the class is INVARIANT
   *   in it and a narrower annotation rejects every caller's own metadata shape.
   */
  const parkUntil = <T>(input: {
    read: () => T | null;
    timeoutMs: number;
    asTimeout: () => Error;
  }): Promise<T> =>
    new Promise<T>((done, fail) => {
      // .note = deliberate mutation, bounded to this promise — `settled` latches so a wake
      //   that races the bound cannot settle an already-settled promise
      let settled = false;
      const finish = (act: () => void): void => {
        if (settled) return;
        settled = true;
        waiters.delete(wake);
        clearTimeout(timer);
        act();
      };
      const wake = (): void => {
        const value = input.read();
        if (value !== null) finish(() => done(value));
      };
      const timer = setTimeout(
        () => finish(() => fail(input.asTimeout())),
        input.timeoutMs,
      );
      waiters.add(wake);
      wake();
    });

  // wait for the accumulated output to match; reject on exit-before-match or on the bound
  const waitForOutput = async (waitInput: {
    pattern: RegExp;
    timeoutMs?: number;
  }): Promise<RegExpMatchArray> => {
    const timeoutMs = waitInput.timeoutMs ?? 15000;

    // ⚠️ the read yields an OUTCOME rather than throws. a throw inside `read` would
    //   propagate out of `notify`, i.e. out of the pty's own event handler, where no
    //   caller can catch it — so the exit case is carried back as data and raised here
    const outcome = await parkUntil<
      { matched: RegExpMatchArray } | { exitedFirst: number }
    >({
      read: () => {
        const match = output.match(waitInput.pattern);
        if (match) return { matched: match };
        if (exited) return { exitedFirst: exited.code };
        return null;
      },
      timeoutMs,
      asTimeout: () =>
        new ConstraintError(
          `timed out after ${timeoutMs}ms for ${String(waitInput.pattern)}`,
          { timeoutMs, pattern: String(waitInput.pattern), output },
        ),
    });

    if ('exitedFirst' in outcome)
      throw new ConstraintError(
        `rhachet exited (code ${outcome.exitedFirst}) before output matched ${String(
          waitInput.pattern,
        )}`,
        {
          exitCode: outcome.exitedFirst,
          pattern: String(waitInput.pattern),
          output,
        },
      );
    return outcome.matched;
  };

  // wait for the child's own exit; reject on the bound so a wedged run fails loud with
  // its accumulated output rather than hangs the suite to the jest-wide cap
  const waitForExit = async (exitInput?: {
    timeoutMs?: number;
  }): Promise<number> => {
    const timeoutMs = exitInput?.timeoutMs ?? 15000;
    const outcome = await parkUntil<{ code: number }>({
      read: () => exited,
      timeoutMs,
      asTimeout: () => {
        const error = new ConstraintError(
          `timed out after ${timeoutMs}ms, rhachet never exited`,
          { timeoutMs, output },
        );
        // ⚠️ the MARK is what `kill`'s allowlist matches on. see its note for why the
        //   class alone is too wide a read to allowlist a teardown on
        Object.assign(error, { [EXIT_TIMEOUT_MARK]: true });
        return error;
      },
    });
    return outcome.code;
  };

  // kill the child, then await its exit (idempotent — a dead child is a no-op)
  //
  // ⚠️ this is the ONE wait that does not throw, and it does not go quiet either. it runs
  //   in teardown, where a throw would replace a real test verdict with a cleanup fault —
  //   so the expected rejection is REPORTED rather than dropped (`rule.forbid.failhide`).
  //   a child that will not die leaks a pty and a pid into the next suite, and the console
  //   line is what attributes that leak to this handle rather than to whatever runs next
  //
  // 🚨 the catch ALLOWLISTS, it does not blanket — and it matches the MARK, never the
  //   CLASS. `waitForExit` can raise only its own bound today, so a class read looked
  //   precise; it is not, because it allowlists a whole error TYPE out of a teardown. any
  //   future guard inside the wait that raises a `ConstraintError` of its own — a bad
  //   argument, an absent handle — would be absorbed into a one-line warn and hidden from
  //   the suite, which is the failhide this catch's own note claims to avoid
  //
  //   ⇒ `EXIT_TIMEOUT_MARK` is minted by `waitForExit` alone, so the allowlist admits
  //   exactly the one condition it was written for. every OTHER error rethrows, a
  //   `ConstraintError` among them (raised by the r006 `maintenance-hazards` lane at i076)
  //
  // ⚠️ an own-property read, never `instanceof` — the same realm-independence
  //   `isCloneSocketBindFaultError` documents from a measured defect: under jest an
  //   `instanceof` answers false for exactly the errors it exists to classify
  //
  // ✅ and the outcome is RETURNED, never only warned. a console line is legible to a human
  //   who reads the run and to no code at all — so `{ exited }` is the machine-side half, and
  //   a caller that cares whether the child actually died branches on it rather than greps
  //   stderr. the report is the floor here, never the whole of it
  const kill = async (): Promise<{ exited: boolean }> => {
    if (exited) return { exited: true };
    child.kill();
    return await waitForExit({ timeoutMs: 5000 })
      .then(() => ({ exited: true }))
      .catch((error: unknown) => {
        // read BOTH fields off one structural cast — the mark decides the allowlist, the
        // message is the report. `unknown` narrows through neither, and an `instanceof`
        // would reinstate the realm dependence the mark exists to avoid
        const marked = error as {
          [EXIT_TIMEOUT_MARK]?: unknown;
          message?: unknown;
        } | null;
        if (marked?.[EXIT_TIMEOUT_MARK] !== true) throw error;
        console.warn(
          `⚠️ spawnRhachetCliBackground: pid ${child.pid} did not exit within 5000ms of kill(); the process may still be live. cause: ${String(marked.message)}`,
        );
        return { exited: false };
      });
  };

  return {
    pid: child.pid,
    getOutput: () => output,
    waitForOutput,
    waitForExit,
    write: (data) => child.write(data),
    kill,
  };
};
