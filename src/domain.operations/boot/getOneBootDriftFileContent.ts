import { MalfunctionError } from 'helpful-errors';

import { readFileSync } from 'node:fs';
import { isNativeError } from 'node:util/types';

/**
 * .what = read a boot drift file whole — a latch, a clone's spawn boot or its drift
 * .why = every reader of the boot drift fails loud the same way, with the path (vision case=21),
 *        never as a raw fs error
 * .note = an explicit catch, not `MalfunctionError.wrap`: wrap (helpful-errors 1.7.5) rethrows a
 *         sync fs error raw, which drops the path this read exists to name
 * .note = the cause is kept as thrown (`isNativeError`, never `instanceof Error`): an fs error from
 *         another realm would be rewrapped and lose its errno code, which the sweep's fault
 *         allowlist reads (`asBootDriftFaultCause`)
 */
export const getOneBootDriftFileContent = (input: { path: string }): string => {
  try {
    return readFileSync(input.path, 'utf8');
  } catch (error) {
    throw new MalfunctionError('a boot drift file could not be read', {
      path: input.path,
      hint: 'respawn the clone (`rhx enroll`): it boots on the current boot and reads no file of the old one',
      cause: isNativeError(error) ? error : new Error(String(error)),
    });
  }
};
