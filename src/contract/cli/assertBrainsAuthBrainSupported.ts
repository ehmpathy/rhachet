import { ConstraintError } from 'helpful-errors';

/**
 * .what = refuse a brain that has no auth adapter, for any `brains auth` verb
 * .why = `set`, `get` and `use` all take `--brain`, so a caller who names another brain hears the
 *   same refusal from each, never a bare "unknown option" from one of them
 * .note = only claude has an adapter today; a second brain adds its own context (fulcrum F3)
 */
export const assertBrainsAuthBrainSupported = (input: {
  brain: string | undefined;
  verb: 'set' | 'get' | 'use';
}): void => {
  if (input.brain === 'claude') return;
  throw new ConstraintError('no auth adapter for this brain', {
    brain: input.brain,
    brainsSupported: 'claude',
    hint: `rhx brains auth ${input.verb} --brain claude`,
  });
};
