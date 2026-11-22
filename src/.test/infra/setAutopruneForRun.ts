import { setTempDirReclaimOnInterrupt } from './setTempDirReclaimOnInterrupt';

/**
 * .what = how long an interrupted run's reclaim may take before it exits anyway
 */
const RECLAIM_ON_INTERRUPT_WITHIN_MS = 30_000;

/**
 * .what = wires one jest run's temp-dir reclaim: mint the autoprune run id, and reclaim on a signal
 * .why = every tier's globalSetup needs the same two steps in the same order, so they live in one
 *        operation; a tier that composes more (e.g. a keyrack source) calls this first, and no tier
 *        can drift from another on the order or the bound
 *
 * .note = RELATIVE imports, and test-fns by its package subpath: a globalSetup loads before jest's
 *         moduleNameMapper exists, so an `@src` alias here would fail at startup
 */
export const setAutopruneForRun = async (input: {
  globalConfig: { globalTeardown?: string | null };
}): Promise<void> => {
  // mint this run's autoprune id before workers fork
  const { default: setupAutoprune } = await import(
    'test-fns/autoprune.setup.jest'
  );
  await setupAutoprune(input.globalConfig);

  // reclaim this run's temp dirs on a ctrl-c or a kill, too — the same teardown the clean path runs
  const { default: teardown } = await import(
    'test-fns/autoprune.teardown.jest'
  );
  setTempDirReclaimOnInterrupt({
    teardown,
    withinMs: RECLAIM_ON_INTERRUPT_WITHIN_MS,
  });
};
