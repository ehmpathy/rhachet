import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { BRAIN_DIR_BOOT_FILENAMES } from '@src/domain.operations/boot/constants';

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = the content hash of the boot the actor holds now, at the first say, or null when it
 *   has none
 * .why = the fleet gate keys its lead record by this hash, so two role sets never wait on each
 *   other; one leaf owns the path, the read, and the cut
 * .note = it reads the live `boot.md`, not a stamp from spawn: a re-render between a clone's
 *   spawn and its first say re-keys that clone, and the hash leaves out the model. either
 *   miss costs one wasted wait, bounded by `BOOT_CACHE_LEAD_UNANSWERED_MS`, never a wrong
 *   answer (fulcrum F8)
 */
export const getOneBootHashOfActor = (input: {
  actorDir: string;
}): string | null => {
  // an actor with no rendered boot has no boot to cache
  const bootMdPath = join(
    getBrainOndiskDir({ actorDir: input.actorDir }),
    BRAIN_DIR_BOOT_FILENAMES.bootMd,
  );
  if (!existsSync(bootMdPath)) return null;

  // 16 hex chars: wide enough that two boots never share a lead record
  return createHash('sha256')
    .update(readFileSync(bootMdPath))
    .digest('hex')
    .slice(0, 16);
};
