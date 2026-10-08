import { readFileSync } from 'node:fs';
import { getOneRepoThisBootBudgetMemoPath } from './getOneRepoThisBootBudgetMemoPath';

/**
 * .what = the fingerprint the prior clean sweep memoized, or null where none is readable
 * .why = the read half of the memo boundary. a memo that cannot be read is a cache miss,
 *        never a fault — the sweep then runs
 *
 * .note = the read IS the check: an absent memo, or one removed mid-read, is a miss. every
 *   other errno throws unchanged
 */
export const getOneRepoThisBootBudgetMemo = (input: {
  cwd: string;
}): { fingerprint: string } | null => {
  const content = ((): string | null => {
    try {
      return readFileSync(
        getOneRepoThisBootBudgetMemoPath({ cwd: input.cwd }),
        'utf8',
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return null;
      throw error;
    }
  })();
  if (content === null) return null;
  try {
    const parsed = JSON.parse(content) as { fingerprint?: unknown };
    return typeof parsed.fingerprint === 'string'
      ? { fingerprint: parsed.fingerprint }
      : null;
  } catch (error) {
    // a torn or hand-edited memo is a miss; the sweep recomputes it. aught else is a fault
    if (error instanceof SyntaxError) return null;
    throw error;
  }
};
