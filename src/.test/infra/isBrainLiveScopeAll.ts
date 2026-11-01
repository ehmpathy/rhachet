import { ConstraintError } from 'helpful-errors';

/**
 * .what = the flag that targets the on-demand live-brain tests (tier 3)
 * .why = one name, read in one place, so the gate is documented once and greppable everywhere
 */
export const BRAIN_LIVE_SCOPE_FLAG = 'BRAIN_LIVE_SCOPE';

/**
 * .what = true when the run targets every live-brain test, via `BRAIN_LIVE_SCOPE=all`
 * .why = a live-brain test spends real money per run; only the smoke tier runs by default
 * .note = a closed set: absent or empty is off, `all` is on, and any other value fails loud,
 *   since a typo (`true`, `ALL`) that read as off would skip every suite and pass green
 */
export const isBrainLiveScopeAll = (input: { env: NodeJS.ProcessEnv }): boolean => {
  // off when absent or empty
  const value = input.env[BRAIN_LIVE_SCOPE_FLAG];
  if (!value) return false;

  // on when it names the one scope
  if (value === 'all') return true;

  // refuse any other value, so a typo never reads as a green run
  throw new ConstraintError(`${BRAIN_LIVE_SCOPE_FLAG} must be 'all' or unset`, {
    value,
    hint: `unset it, or run rhx test.brain.live, which sets ${BRAIN_LIVE_SCOPE_FLAG}=all for one scoped run`,
  });
};
