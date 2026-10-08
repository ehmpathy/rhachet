/**
 * .what = the count of orphaned hooks a prune removed, across every brain config it touched
 * .why = the sync summary reports orphans removed as one number; the fold is named so the
 *        orchestrator reads it rather than simulates it
 */
export const getOneHookOrphanCount = (input: {
  removed: { hooks: unknown[] }[];
}): number => input.removed.reduce((sum, one) => sum + one.hooks.length, 0);
