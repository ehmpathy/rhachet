import { join } from 'node:path';
import { BOOT_REVISION_DIR_PREFIX } from './constants';
import { getActorBootRevisionsRootDir } from './getActorBootRevisionsRootDir';

/**
 * .what = the dir of one boot revision of an actor: `<actor>/boots/sha256=<hash>/`
 * .why = a clone spawns on the boot bytes of one instant; those bytes, and the drift a
 *        compaction reads beside them, belong to the actor (they derive from its roles), so
 *        every clone that spawned on the same bytes refers to the one dir by its hash
 *        (`rule.forbid.per-clone-config`)
 */
export const getActorBootRevisionDir = (input: {
  actorDir: string;
  hash: string;
}): string =>
  join(
    getActorBootRevisionsRootDir({ actorDir: input.actorDir }),
    `${BOOT_REVISION_DIR_PREFIX}${input.hash}`,
  );
