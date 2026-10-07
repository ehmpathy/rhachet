import { findsertAgentEphemeralGitignore } from '@src/domain.operations/invoke/link/findsertAgentEphemeralGitignore';

import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { getOneBrainTokenMemoPath } from './getOneBrainTokenMemoPath';

/**
 * .what = the errnos that mean the memo dir refuses a write — a recount next run is the cost
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
 * .what = writes the token-count memo; a refused write is absorbed
 * .why = the write half of the memo boundary. a write that fails (read-only mount, full disk)
 *        must not turn a correct count into a failed command — the fault costs one recount
 *
 * .note = temp-write + rename, as the enroll writers do. two runs that race each write a memo
 *   whose every count is exact, so last-writer-wins loses at most a few memo entries and no
 *   reader sees a torn file
 */
export const setOneBrainTokenMemo = (input: {
  cwd: string;
  counts: Record<string, number>;
}): void => {
  const path = getOneBrainTokenMemoPath({ cwd: input.cwd });
  try {
    findsertAgentEphemeralGitignore({
      dir: join(input.cwd, '.agent/.cache'),
      kind: 'cache',
    });
    mkdirSync(dirname(path), { recursive: true });
    const pathTemp = `${path}.${process.pid}.tmp`;
    writeFileSync(pathTemp, `${JSON.stringify(input.counts)}\n`);
    renameSync(pathTemp, path);
  } catch (error) {
    // .note = deliberate: an fs refusal (read-only mount, full disk, no permission) only
    //   costs a recount on the next run. every other fault throws
    const code = (error as NodeJS.ErrnoException)?.code;
    if (!code || !ERRNOS_MEMO_WRITE_REFUSED.has(code)) throw error;
  }
};
