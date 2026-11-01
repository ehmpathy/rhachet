import { ConstraintError } from 'helpful-errors';

import { isBrainScreenCreditSpent } from './isBrainScreenCreditSpent';

/**
 * .what = the error a tier-2 harness throws when a brain's screen says the api credit is spent,
 *   or null when the screen names no spent credit
 * .why = a spent credit is the one cause of a tier-2 red that no code change cures; the say poll
 *   and the readiness waits each name it the same way, from one place
 */
export const getErrorOfCreditSpent = (input: {
  text: string;
  phase: 'replied' | 'got ready';
  address: string | null;
  cause: Error | null;
}): ConstraintError<{
  address?: string;
  stops: string;
  unaffected: string;
  hint: string;
  cause?: Error;
}> | null => {
  // say naught when the screen names no spent credit
  if (!isBrainScreenCreditSpent({ text: input.text })) return null;

  // name the cause, what it stops, what it leaves green, and who decides the cure, one per field
  return new ConstraintError(
    `the anthropic api credit is spent, so the brain never ${input.phase}`,
    {
      // the clone's address, only when a clone was named; a null row is noise to a human
      ...(input.address ? { address: input.address } : {}),
      stops:
        'every test that bills the api key, which is the smoke suite on cicd and the live suites run on demand',
      unaffected: 'every test that bills no key, which runs green meanwhile',
      hint: 'no code change cures it. ask whoever funds the ehmpath test ANTHROPIC_API_KEY to restore its credit, then re-run',
      ...(input.cause ? { cause: input.cause } : {}),
    },
  );
};
