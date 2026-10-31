/**
 * .what = the flag that targets the on-demand live-brain tests (tier 3)
 * .why = one name, read in one place, so the gate is documented once and greppable everywhere
 */
export const BRAIN_LIVE_SCOPE_FLAG = 'BRAIN_LIVE_SCOPE';

/**
 * .what = true when the run targets every live-brain test, via `BRAIN_LIVE_SCOPE=all`
 * .why = a live-brain test spends real money per run; only the smoke tier runs by default
 */
export const isBrainLiveScopeAll = (input: {
  env: NodeJS.ProcessEnv;
}): boolean => input.env[BRAIN_LIVE_SCOPE_FLAG] === 'all';

/**
 * .what = a describe that runs only when `BRAIN_LIVE_SCOPE=all`; else it is skipped, by name
 * .why = tier 3 of the live-brain cost bound: every live-brain test beyond the smoke tier is
 *   off by default, on cicd and on a crew box alike, and runs on demand by the named flag
 * .note = never a silent skip: the skipped describe's title names its tier and the flag that
 *   runs it, so jest's verbose report shows each gated test and how to run it
 * .note = see rule.forbid.live-brain-spend-beyond-the-smoke-tier
 */
export const describeBrainLiveOnDemand = (
  name: string,
  fn: () => void,
): void => {
  // run in full when targeted
  if (isBrainLiveScopeAll({ env: process.env })) return describe(name, fn);

  // skip by name, with the flag that runs it
  return describe.skip(
    `${name} [gated: tier-3 live brain; run with ${BRAIN_LIVE_SCOPE_FLAG}=all]`,
    fn,
  );
};
