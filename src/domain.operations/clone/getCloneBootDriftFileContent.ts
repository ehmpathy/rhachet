import { MalfunctionError } from 'helpful-errors';

import { readFileSync } from 'node:fs';

/**
 * .what = read a boot drift file whole — a spawn ref, a latch, a revision's boot or drift
 * .why = every reader of the boot drift fails loud the same way, with the path (vision case=21),
 *        never as a raw fs error
 */
export const getCloneBootDriftFileContent = (input: {
  path: string;
}): string => {
  try {
    return readFileSync(input.path, 'utf8');
  } catch (error) {
    throw new MalfunctionError('a boot drift file could not be read', {
      path: input.path,
      cause: error instanceof Error ? error : new Error(String(error)),
    });
  }
};
