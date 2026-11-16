import { ConstraintError, MalfunctionError } from 'helpful-errors';

import type { BrainAuthUsage } from '@src/domain.objects/BrainAuthUsage';
import { asBrainAuthSlotUnlockHint } from '@src/domain.operations/brain/auth/account/slot/asBrainAuthSlotUnlockHint';

/**
 * .what = fail `get` by who must fix it, when no account could be read at all
 * .why = case=11 — the pool loop reads the exit code: a rate limit or an outage must tell it to
 *   back off (exit 1), never to treat the accounts as dead; a table of only dead accounts needs a
 *   human's `set` (exit 2)
 * .note = one row read, or one row the grove names unverified, is enough for exit 0: the table is
 *   the answer, and each other row names its own fix (case=5 [t2], case=11 [t0])
 * .note = called after the render, so the table reaches stdout before the exit
 * .note = a table with no row read and a locked keyrack is the caller's to fix (exit 2, the unlock)
 */
export const assertBrainAuthUsageReadable = (input: {
  usages: BrainAuthUsage[];
  owner: string;
}): void => {
  // an empty table is an answer: it names `set` as the next move
  if (input.usages.length === 0) return;

  // any row with an answer is enough
  const isAnyAnswered = input.usages.some(
    (usage) => usage.status === 'read' || usage.status === 'unverified',
  );
  if (isAnyAnswered) return;

  // no row read: a fault a retry may cure outranks a dead login
  const isAnyFault = input.usages.some(
    (usage) => usage.status === 'rate-limited' || usage.status === 'unreadable',
  );
  if (isAnyFault)
    throw new MalfunctionError('no brain account could be read', {
      statuses: input.usages.map((usage) => `${usage.email} = ${usage.status}`),
      hint: 'the provider did not answer, or answered in a shape rhachet cannot read, and the accounts are not dead; wait a few minutes, then retry. if it persists, file a defect at ehmpathy/rhachet',
    });

  // no row read, and the keyrack would not open: the unlock is the caller's to run
  const isAnyLocked = input.usages.some((usage) => usage.status === 'locked');
  if (isAnyLocked)
    throw new ConstraintError('no brain account could be read', {
      statuses: input.usages.map((usage) => `${usage.email} = ${usage.status}`),
      hint: asBrainAuthSlotUnlockHint({ owner: input.owner }),
    });
  throw new ConstraintError('no brain account could be read', {
    statuses: input.usages.map((usage) => `${usage.email} = ${usage.status}`),
    hint: asDeadLoginsHint({ usages: input.usages }),
  });
};

/**
 * .what = the fix for a table of refused logins, by which kind was refused
 * .why = the signed-in login is renewed by claude's own `/login`; a stored one by `set`. a hint that
 *   names the wrong one sends the human to a fix that does not apply
 */
const asDeadLoginsHint = (input: { usages: BrainAuthUsage[] }): string => {
  const isAnySignedIn = input.usages.some((usage) => usage.signedIn);
  const isAnyStored = input.usages.some((usage) => !usage.signedIn);
  if (isAnySignedIn && !isAnyStored)
    return 'the provider refused the signed-in login; run `/login` in any claude session';
  if (isAnySignedIn)
    return 'each login was refused; run `/login` in claude for the signed-in one, and `rhx brains auth set --brain claude` for each stored one';
  return 'each parked login was refused; log in again via: rhx brains auth set --brain claude';
};
