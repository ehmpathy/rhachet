import { ConstraintError } from 'helpful-errors';

import type { CloneSayAwaitTarget } from './computeCloneSayPollStep';

/**
 * .what = cast a raw `--await` string to a `CloneSayAwaitTarget`, or fail loud with the
 *   valid set
 * .why = the orchestrator reads the caller's target-state knob as a named cast, never an
 *   inline validate-and-narrow — an unknown value names the fix rather than a bare throw
 *   (rule.require.errors-name-the-fix). the closed set is `enqueue` | `release` (the
 *   declared `CloneSayAwaitTarget`), so a fourth value is a compile error here
 */
export const asCloneSayAwaitTarget = (input: {
  raw: string;
}): CloneSayAwaitTarget => {
  if (input.raw !== 'enqueue' && input.raw !== 'release')
    throw new ConstraintError(
      `--await must be 'enqueue' or 'release', got '${input.raw}'`,
      { hint: 'omit --await for the default (enqueue)' },
    );
  return input.raw;
};
