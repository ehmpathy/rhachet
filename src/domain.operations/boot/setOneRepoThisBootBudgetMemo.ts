import { findsertAgentEphemeralGitignore } from '@src/domain.operations/invoke/link/findsertAgentEphemeralGitignore';

import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { getOneRepoThisBootBudgetMemoPath } from './getOneRepoThisBootBudgetMemoPath';

/**
 * .what = the errnos that mean the memo dir refuses a write — a recompute next stop is the cost
 * .why = the memo is an optimization, so only a refusal is absorbed. an `EIO` or a bad path
 *        type is a real fault, and it throws
 */
const ERRNOS_MEMO_WRITE_REFUSED = new Set([
  'EACCES',
  'EPERM',
  'EROFS',
  'ENOSPC',
  'EDQUOT',
]);

/**
 * .what = writes the `.this` within-budget memo; a refused write is absorbed
 * .why = the write half of the memo boundary. the memo is an optimization, so a write that
 *        fails (read-only mount, full disk) must not turn a clean stop into a held one — the
 *        fault costs one sweep next time
 *
 * .note = temp-write + rename, as the enroll writers do. two stops that race write the same
 *   content for the same fingerprint, so last-writer-wins is safe and no reader sees a torn file
 */
export const setOneRepoThisBootBudgetMemo = (input: {
  cwd: string;
  fingerprint: string;
}): void => {
  const path = getOneRepoThisBootBudgetMemoPath({ cwd: input.cwd });
  try {
    findsertAgentEphemeralGitignore({
      dir: join(input.cwd, '.agent/.cache'),
      kind: 'cache',
    });
    mkdirSync(dirname(path), { recursive: true });
    const pathTemp = `${path}.${process.pid}.tmp`;
    writeFileSync(
      pathTemp,
      `${JSON.stringify({ fingerprint: input.fingerprint, verdict: 'within' }, null, 2)}\n`,
    );
    renameSync(pathTemp, path);
  } catch (error) {
    // .note = deliberate: an fs refusal (read-only mount, full disk, no permission) only
    //   costs a recompute on the next stop. every other fault throws
    const code = (error as NodeJS.ErrnoException)?.code;
    if (!code || !ERRNOS_MEMO_WRITE_REFUSED.has(code)) throw error;
  }
};
