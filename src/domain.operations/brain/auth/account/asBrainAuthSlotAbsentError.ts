import { ConstraintError } from 'helpful-errors';

import { asBrainAuthSetHint } from './asBrainAuthSetHint';

/**
 * .what = the refusal for an account the keyrack does not hold
 * .why = `get --account` and `use` both refuse an absent slot; one constructor names the accounts
 *   held and the set that adds this one, the same way in both
 */
export const asBrainAuthSlotAbsentError = (input: {
  email: string;
  held: string[];
  signedIn: string | null;
}) =>
  new ConstraintError(`no stored credential for ${input.email}`, {
    held: input.held,
    signedIn: input.signedIn ?? 'none',
    hint: asBrainAuthSetHint({ email: input.email }),
  });
