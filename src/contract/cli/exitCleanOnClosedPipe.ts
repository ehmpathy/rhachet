/**
 * .what = exits clean when a pipe consumer closes stdout early
 * .why = every rhx stdout exists to be piped — `| head`, `| grep -m1`, a `less` the human quits.
 *        node then emits an async `error` on the stdout socket, and an UNHANDLED one crashed the
 *        process with a raw node stack trace. that dump is the one render
 *        `rule.require.errors-name-the-fix` forbids a human to be shown, and `def.frictionless`
 *        rejects outright ("no unexpected error, stack trace, or stall")
 *
 * .note = EPIPE here is NORMAL — it is precisely why `head` composes with every unix tool — so it
 *         exits clean, the way `yes | head` does. any OTHER write error is RETHROWN, since a bare
 *         listener would otherwise swallow all of them (`rule.forbid.failhide`)
 *
 * .note = `invokeKeyrack` carries this same guard for its `--value` render, and its docblock
 *         reasons that only a raw `process.stdout.write` needs one, because node's `console.log`
 *         documents a swallow of write errors. 🔴 that holds for a BARE node console, and this cli
 *         does not have one: `withEmojiSpaceShim` replaces `console.log` with its own wrapper,
 *         which re-emits the write error rather than swallow it. the walked proof is a stack whose
 *         frames read `at console.log (node:internal/console/constructor:384:26)` then
 *         `at console.console.log (…/emoji-space-shim/…/shimConsoleLog.ts:21:17)` — so every
 *         multi-line render is exposed, never just the one raw write
 *
 * .note = the stream, the exit, and the prior code are INPUTS rather than reached for directly, so
 *         the contract above is unit-clampable. an end-to-end walk cannot pin it: the error event
 *         is async, so a command that finishes fast exits before the event fires, and one that
 *         pauses mid-render crashes — the difference is a race, and a race makes a clamp with no
 *         teeth
 *
 * .note = 🔴 a truncation exits clean, yet it must NOT relabel a run that had ALREADY failed. a
 *         `rhx run --skill <absent> | head -1` sets exit 2 for its `✋ ConstraintError`, then closes
 *         the pipe — and a flat `exit(0)` there reports SUCCESS for a refused command. so the prior
 *         code wins whenever one is set: EPIPE says "the reader left", never "the work succeeded".
 *         an unconditional 0 is the `rule.forbid.failhide` shape at the exit-code grain, and a
 *         caller that scripts on `$?` is the one it misleads
 */
export const exitCleanOnClosedPipe = (input: {
  /** the stream whose write errors are judged — `process.stdout` in the cli */
  stream: NodeJS.EventEmitter;
  /** how the process ends on a normal truncation — `process.exit` in the cli */
  exit: (code: number) => void;
  /**
   * the exit code already set before the pipe closed, read AT EVENT TIME —
   * `() => process.exitCode` in the cli. a thunk rather than a value, since the code is
   * assigned while the render runs, long after this guard is armed
   *
   * .note = the `string` arm is node's own: it types `process.exitCode` as
   *   `number | string | undefined`. it is normalized HERE rather than at each call site, so
   *   all three stay a plain read of the property
   */
  codePrior: () => number | string | undefined;
}): void => {
  input.stream.on('error', (error: NodeJS.ErrnoException) => {
    // a closed consumer is a normal end, never a fault to report — but a failure already
    // recorded outranks it, so the prior code carries through rather than flatten to 0
    if (error.code === 'EPIPE') {
      const codeOfRun = Number(input.codePrior() ?? 0);

      // an unparseable code falls to 1, never 0: node itself rejects such a value at exit, so
      // it marks a broken run — and the safe side of an unknown is failure, never success
      return input.exit(Number.isFinite(codeOfRun) ? codeOfRun : 1);
    }

    // every other write error is a real one, so it must still surface
    throw error;
  });
};
