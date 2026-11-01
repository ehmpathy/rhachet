import {
  BRAIN_LIVE_SCOPE_FLAG,
  isBrainLiveScopeAll,
} from '@src/.test/infra/isBrainLiveScopeAll';

/**
 * .what = a describe that runs only when `BRAIN_LIVE_SCOPE=all`; else it is skipped, by name
 * .why = tier 3 of the live-brain cost bound: every live-brain test beyond the smoke tier is
 *   off by default, on cicd and on a crew box alike, and runs on demand by the named flag
 * .note = never a silent skip: a todo row beside the skipped describe names its tier, the paved
 *   skill that runs it and the flag that skill sets, so jest's verbose report shows each gated
 *   suite and how to run it
 * .note = the skipped describe keeps its own title, so its snapshots stay keyed and are never
 *   reported obsolete
 * .note = 🔴 jest runs a skipped describe's body to register its tests, so a gated body must do
 *   no i/o and read no credential at collection: defer each into a `beforeAll` or a getter
 * .note = getAllLiveBrainSuitesUngated is the clamp: a suite that reaches a live brain outside
 *   this gate fails its scan
 * .note = see rule.forbid.live-brain-spend-beyond-the-smoke-tier
 * .note = `context` defaults to jest's own globals; a test passes fakes to observe what registers
 */
export const describeBrainLiveOnDemand = (
  name: string,
  fn: () => void,
  context: {
    env: NodeJS.ProcessEnv;
    describe: { (name: string, fn: () => void): void; skip: (name: string, fn: () => void) => void };
    test: { todo: (name: string) => void };
  } = { env: process.env, describe, test },
): void => {
  // run in full when targeted
  if (isBrainLiveScopeAll({ env: context.env })) return context.describe(name, fn);

  // skip under its own title, and name the gate in a todo row
  context.test.todo(
    `[gated: tier-3 live brain] ${name} — run with rhx test.brain.live, which sets ${BRAIN_LIVE_SCOPE_FLAG}=all`,
  );
  return context.describe.skip(name, fn);
};
