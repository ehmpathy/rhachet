import { realpathSync } from 'node:fs';
import { asSnapshotSafe } from './asSnapshotSafe';

/**
 * .what = masks both names of a `genTempDir` dir out of a message: the path it returned, and
 *         its realpath
 * .why = the dir answers to two strings, and a swap of one leaves the other in a committed
 *        snapshot (`rule.require.mask-both-names-of-a-temp-dir`)
 */
export const asTempDirMasked = (input: {
  of: string;
  dir: string;
  into: string;
}): string =>
  asSnapshotSafe({
    of: input.of,
    masks: [
      { path: input.dir, into: input.into },
      { path: realpathSync(input.dir), into: input.into },
    ],
  });
