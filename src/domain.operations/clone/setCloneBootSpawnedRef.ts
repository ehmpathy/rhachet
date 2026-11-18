import { setFileAtomic } from '@src/infra/setFileAtomic';

import { join } from 'node:path';

/** the clone record file that names the boot revision a clone spawned on */
export const CLONE_BOOT_SPAWNED_REF_FILENAME = 'boot.spawned.ref';

/**
 * .what = record which boot revision a clone spawned on, by its hash, in the clone dir
 * .why = the revision itself is the actor's (it derives from the roles); the clone holds only
 *        a reference to it, the one fact about the boot that derives from this run
 *        (`rule.forbid.per-clone-config`). the drift nudge reads it to find the clone's drift
 */
export const setCloneBootSpawnedRef = (input: {
  cloneDir: string;
  hash: string;
}): void =>
  setFileAtomic({
    path: join(input.cloneDir, CLONE_BOOT_SPAWNED_REF_FILENAME),
    content: `${input.hash}\n`,
  });
