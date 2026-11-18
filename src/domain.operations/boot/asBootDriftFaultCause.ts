import { MalfunctionError } from 'helpful-errors';

import { isNativeError } from 'node:util/types';

/**
 * .what = the cause a drift sweep may collect as a fault, or null for an error it must rethrow
 * .why = the sweep collects a filesystem fault (an errno code, or a read wrapped as a
 *        malfunction) so the rest still write; any other error is a defect in the code, and
 *        must rethrow rather than read as a fault row
 * .note = `isNativeError`, never `instanceof Error`: an fs error may come from another realm
 *         (a vm context, a test sandbox), where `instanceof` is false for a real errno fault
 */
export const asBootDriftFaultCause = (input: {
  error: unknown;
}): Error | null => {
  if (input.error instanceof MalfunctionError) return input.error;
  if (!isNativeError(input.error)) return null;
  return 'code' in input.error && typeof input.error.code === 'string'
    ? input.error
    : null;
};
