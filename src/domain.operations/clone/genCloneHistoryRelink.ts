import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getActorsRootDir } from '@src/domain.operations/actor/enrolled/getActorsRootDir';
import { getOneActorOndiskByHash } from '@src/domain.operations/actor/enrolled/getOneActorOndiskByHash';

import { genCloneHistoryLink } from './genCloneHistoryLink';
import { getCloneDir } from './getCloneDir';

/**
 * .what = re-link any transcript the brain wrote for this clone AFTER spawn — the
 *   findsert (idempotent) refresh that makes a lazily-written transcript observable
 * .why =
 *   - a fresh clone's transcript is written lazily by the brain, sometimes only after
 *     a `say`. the submit self-verify polls the transcript, so it must re-link on each
 *     poll to pick up a transcript that appears mid-wait
 *   - this is the EXPLICIT side-effect step, extracted out of the count read so that
 *     `getCloneSubmittedCount` stays a pure `get*` (no hidden filesystem writes behind
 *     a read name) — the caller sequences relink-then-count deliberately
 *
 * .note = idempotent: a transcript already linked is a no-op; a clone whose actor
 *   record is absent (never enrolled here) links no transcript
 */
export const genCloneHistoryRelink = (input: {
  repoPath: string;
  clone: CloneOndisk;
}): void => {
  const cloneDir = getCloneDir({
    actorDir: getActorOndiskDir({
      repoPath: input.clone.actor.repoPath,
      hash: input.clone.actor.hash,
    }),
    serial: input.clone.serial,
  });
  const actorsRoot = getActorsRootDir({ repoPath: input.clone.actor.repoPath });

  const actorRecord = getOneActorOndiskByHash({
    repoPath: input.repoPath,
    hash: input.clone.actor.hash,
  });
  if (actorRecord)
    genCloneHistoryLink({
      cloneDir,
      actorsRoot,
      cwd: input.clone.actor.repoPath,
      brain: actorRecord.brain,
      spawnedAt: input.clone.spawnedAt,
    });
};
