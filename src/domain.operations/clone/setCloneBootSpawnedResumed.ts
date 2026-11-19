import { setFileAtomic } from '@src/infra/setFileAtomic';

import { join } from 'node:path';

/** the clone record file that marks a clone as a resume, whose boot revision is unknown */
export const CLONE_BOOT_SPAWNED_RESUMED_FILENAME = 'boot.spawned.resumed';

/**
 * .what = mark a clone as spawned by a resume, in place of a `boot.spawned.ref`
 * .why = a resumed session replays the system prompt it first recorded, so a ref to this spawn's
 *        revision would claim a boot the clone does not hold; the marker lets every reader say
 *        the baseline is unknown, never that the clone is current
 */
export const setCloneBootSpawnedResumed = (input: { cloneDir: string }): void =>
  setFileAtomic({
    path: join(input.cloneDir, CLONE_BOOT_SPAWNED_RESUMED_FILENAME),
    content: 'resumed\n',
  });
