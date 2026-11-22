import { MalfunctionError } from 'helpful-errors';

/**
 * .what = a promise that rejects once `withinMs` elapses, and the cancel that stops it
 * .why = the reclaim races it; the timer is NOT unref'd, so it fires even when the teardown
 *        waits on naught else (an unref'd timer lets the loop empty, and node would exit 0 —
 *        an interrupt read as a pass). cancel clears it once the race is settled
 */
const genReclaimBound = (input: {
  signal: string;
  withinMs: number;
}): { elapsed: Promise<never>; cancel: () => void } => {
  const timer: { handle: NodeJS.Timeout | null } = { handle: null };
  const elapsed = new Promise<never>((_, reject) => {
    // .note = deliberate mutation: the handle is known only once the timer is set
    timer.handle = setTimeout(
      () =>
        reject(
          new MalfunctionError(
            `the ${input.signal} reclaim took longer than ${input.withinMs}ms`,
            {
              signal: input.signal,
              withinMs: input.withinMs,
              hint: 'raise withinMs, or inspect the test-fns teardown for a handle that never settles',
            },
          ),
        ),
      input.withinMs,
    );
  });
  return {
    elapsed,
    cancel: () => {
      if (timer.handle) clearTimeout(timer.handle);
    },
  };
};

/**
 * .what = on a ctrl-c or a kill, run the test-fns autoprune teardown before the run exits
 * .why = jest never reaches its `globalTeardown` when the run is signaled — measured: a SIGINT to
 *        the run's process group exits 130 with every temp dir the run made left on disk. the
 *        signal path calls the SAME teardown the clean path does; this only decides WHEN it runs
 *
 * .note = called from a composed `globalSetup`, so it registers in the jest MAIN process — the
 *         one process that outlives the workers a signal kills
 * .note = the teardown is handed in, never imported here: the composed globalSetup already
 *         imports test-fns' hooks by their package subpath, which this repo's typecheck cannot see
 * .note = `process.once`, so a second ctrl-c falls through to node's default and exits at once
 * .note = the reclaim is bounded (`withinMs`), so a ctrl-c never becomes a hang; residue then
 *         falls to the test-fns age gate. the exit code is 128 + signal, so an interrupt never
 *         reads as a pass
 * .note = `process.exit` does not drain queued stdout; a report mid-write at the signal may lose
 *         its tail, a deliberate trade for an interrupt that always exits
 */
export const setTempDirReclaimOnInterrupt = (input: {
  /** the test-fns autoprune teardown — `test-fns/autoprune.teardown.jest`'s default export */
  teardown: () => Promise<void>;
  /** how long the reclaim may take before the run exits anyway */
  withinMs: number;
}): void => {
  const signals = [
    { signal: 'SIGINT', exitCode: 130 },
    { signal: 'SIGTERM', exitCode: 143 },
  ] as const;
  for (const { signal, exitCode } of signals)
    process.once(signal, () => {
      void (async () => {
        const bound = genReclaimBound({ signal, withinMs: input.withinMs });
        try {
          await Promise.race([input.teardown(), bound.elapsed]);
        } catch (error) {
          // fail loud, yet still exit: a reclaim fault must never turn an interrupt into a hang
          console.error(
            `💥 MalfunctionError: the ${signal} reclaim of this run's temp dirs failed; the test-fns age gate will reclaim them`,
            error,
          );
        } finally {
          bound.cancel();
          process.exit(exitCode);
        }
      })();
    });
};
