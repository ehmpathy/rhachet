import { MalfunctionError } from 'helpful-errors';

import { setFileAtomic } from '@src/infra/setFileAtomic';

import { join } from 'node:path';
import { isNativeError } from 'node:util/types';

/** the clone record file that holds the drift hash the nudge last told the clone of */
export const CLONE_BOOT_DRIFT_TOLD_FILENAME = 'boot.drift.told';

/**
 * .what = record that this clone was told of this drift
 * .why = the nudge blocks one stop per drift, never a loop: the latch is keyed to the drift's
 *        own hash, so a changed drift speaks again and an unchanged one stays silent
 * .note = it lives in the clone dir, since it records an act of this run, never a fact of the
 *         actor's roles (`rule.forbid.per-clone-config`)
 * .note = an unwritable latch fails loud with its path (vision case=21), never as a raw fs error
 */
export const setCloneBootDriftTold = (input: {
  cloneDir: string;
  drift: string;
}): void => {
  const path = join(input.cloneDir, CLONE_BOOT_DRIFT_TOLD_FILENAME);
  // an explicit catch: `MalfunctionError.wrap` (helpful-errors 1.7.5) rethrows a sync fs error raw;
  //   the cause is kept as thrown, so a cross-realm fs error keeps its errno code
  try {
    setFileAtomic({ path, content: `${input.drift}\n` });
  } catch (error) {
    throw new MalfunctionError('a boot drift file could not be written', {
      path,
      cause: isNativeError(error) ? error : new Error(String(error)),
    });
  }
};
