import { asBootContentHash } from '@src/domain.operations/boot/asBootContentHash';
import { getActorBootCurrentPath } from '@src/domain.operations/boot/getActorBootCurrentPath';

import { existsSync, readFileSync } from 'node:fs';

/**
 * .what = the content hash of the boot the actor holds now, at the first say, or null when it
 *   has none
 * .why = the fleet gate keys its lead record by this hash, so two role sets never wait on each
 *   other; one leaf owns the read and the cut
 * .note = it reads the live `boot.md`, not a stamp from spawn: a re-render between a clone's
 *   spawn and its first say re-keys that clone, and the hash leaves out the model. either
 *   miss costs one wasted wait, bounded by `BOOT_CACHE_LEAD_UNANSWERED_MS`, never a wrong
 *   answer (fulcrum F8)
 */
export const getOneBootHashOfActor = (input: {
  actorDir: string;
}): string | null => {
  // an actor with no rendered boot has no boot to cache
  const bootMdPath = getActorBootCurrentPath({ actorDir: input.actorDir });
  if (!existsSync(bootMdPath)) return null;

  // the same identity a spawn boot meta names its boot by
  return asBootContentHash({ bytes: readFileSync(bootMdPath) });
};
