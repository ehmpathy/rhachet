import { MalfunctionError } from 'helpful-errors';

import { isNativeError } from 'node:util/types';

/**
 * .what = the cause a drift sweep may collect as a fault, or null for an error it must rethrow
 * .why = the sweep collects a filesystem fault (an errno code, or a read wrapped as a
 *        malfunction over one) so the rest still write; any other error is a defect in the
 *        code, and must rethrow rather than read as a fault row
 * .note = a `MalfunctionError` is collected only where its cause is an errno fault: a malfunction
 *         thrown for a broken invariant has no errno cause, so it rethrows
 * .note = `isNativeError`, never `instanceof Error`: an fs error may come from another realm
 *         (a vm context, a test sandbox), where `instanceof` is false for a real errno fault
 */
export const asBootDriftFaultCause = (input: {
  error: unknown;
}): Error | null => {
  // a read wrapped as a malfunction: collected only over an errno cause
  if (input.error instanceof MalfunctionError) {
    const cause = 'cause' in input.error ? input.error.cause : null;
    return asErrnoFault({ error: cause }) === null ? null : input.error;
  }

  // a raw filesystem error
  return asErrnoFault({ error: input.error });
};

/**
 * .what = the error, where it is a filesystem fault by its errno code; else null
 */
const asErrnoFault = (input: { error: unknown }): Error | null => {
  if (!isNativeError(input.error)) return null;
  return 'code' in input.error && typeof input.error.code === 'string'
    ? input.error
    : null;
};
