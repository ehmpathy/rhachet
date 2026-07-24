import { ConstraintError } from 'helpful-errors';

import { readFileSync } from 'node:fs';

/**
 * .what = read a pem file's content from disk
 * .why = the github-app source credential embeds the pem; this isolates the fs read
 *        behind a named communicator so the pem-read path is testable
 *
 * .note = a caller-typed path that cannot be read is caller-fixable, so this throws a
 *         ConstraintError (exit 2) with a hint — the set action renders it as a blocked
 *         treestruct, not a raw exception dump
 */
export const getPemContent = (input: { path: string }): string => {
  try {
    return readFileSync(input.path, 'utf-8');
  } catch (error) {
    throw new ConstraintError('could not read pem file', {
      pemPath: input.path,
      hint: `check the path exists and is readable: ${input.path}`,
      error,
    });
  }
};
