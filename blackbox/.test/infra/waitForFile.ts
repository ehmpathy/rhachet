import { UnexpectedCodePathError } from 'helpful-errors';

import { existsSync } from 'node:fs';

/**
 * .what = await a file a spawned child writes, polled up to a bound
 * .why = an async enroll hands back its address the moment the host's socket binds —
 *   before the brain child it spawned has run far enough to write its own record. a read
 *   at once races that write, so a reader of the child's record polls, never guesses a
 *   settle time
 */
export const waitForFile = async (input: {
  path: string;
  timeoutMs?: number;
}): Promise<void> => {
  const deadline = Date.now() + (input.timeoutMs ?? 10_000);
  while (!existsSync(input.path)) {
    if (Date.now() > deadline)
      throw new UnexpectedCodePathError('the awaited file never appeared', {
        path: input.path,
        timeoutMs: input.timeoutMs ?? 10_000,
      });
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};
