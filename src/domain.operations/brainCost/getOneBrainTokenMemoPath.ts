import { join } from 'node:path';

/**
 * .what = where the token-count memo lives, for one repo
 * .why = `.agent/.cache` is the host-local, self-ignored home for rhachet's caches, and the
 *        read and the write must agree on one path
 *
 * .note = the encoder's vocabulary is IN the path. a count is exact for one vocabulary, so a
 *   change of encoder lands on a fresh file rather than a read of counts from another one
 */
export const getOneBrainTokenMemoPath = (input: { cwd: string }): string =>
  join(
    input.cwd,
    '.agent/.cache/repo=rhachet/skill=token-count/encoder=o200k_base.json',
  );
