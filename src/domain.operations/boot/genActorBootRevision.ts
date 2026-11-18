import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { setFileAtomic } from '@src/infra/setFileAtomic';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { asBootContentHash } from './asBootContentHash';
import { BRAIN_DIR_BOOT_FILENAMES } from './constants';
import { getActorBootRevisionDir } from './getActorBootRevisionDir';
import { setActorBootDrift } from './setActorBootDrift';

/**
 * .what = findsert the boot revision a clone spawns on: the actor's current `boot.md` bytes,
 *         kept at `<actor>/boots/sha256=<hash>/boot.md`, with its drift `CLAUDE.md` beside
 * .why = the clone's system prompt is read from the revision's own `boot.md`, so the bytes
 *        it holds are exactly the bytes the drift is computed from, whatever render lands
 *        after; every clone that spawns on the same bytes shares the one revision
 *
 * .note = the hash is cut from the very bytes it writes, so the dir name never lies
 * .note = the drift is written at once, against a fresh read of the current boot: a render
 *         that landed between the read and the findsert is carried, never missed
 * .note = null when the actor has no rendered boot: no boot, no revision
 */
export const genActorBootRevision = (input: {
  actorDir: string;
}): { hash: string; revisionDir: string; bootMdPath: string } | null => {
  // read the actor's current boot once; the revision is cut from these bytes
  const bootMdPathCurrent = join(
    getBrainOndiskDir({ actorDir: input.actorDir }),
    BRAIN_DIR_BOOT_FILENAMES.bootMd,
  );
  if (!existsSync(bootMdPathCurrent)) return null;
  const bytes = readFileSync(bootMdPathCurrent, 'utf8');
  const hash = asBootContentHash({ bytes });

  // findsert the revision's boot; same hash, same bytes, so an extant one is kept
  const revisionDir = getActorBootRevisionDir({
    actorDir: input.actorDir,
    hash,
  });
  const bootMdPath = join(revisionDir, BRAIN_DIR_BOOT_FILENAMES.bootMd);
  if (!existsSync(bootMdPath))
    setFileAtomic({ path: bootMdPath, content: bytes });

  // write its drift against the boot as it stands now
  setActorBootDrift({ revisionDir, bootMdPathCurrent });

  return { hash, revisionDir, bootMdPath };
};
