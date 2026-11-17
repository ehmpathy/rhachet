import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';

import { genCloneHistoryRelink } from '../genCloneHistoryRelink';
import { getCloneDir } from '../getCloneDir';
import { getOneCloneByRef } from '../getOneCloneByRef';
import { getCloneTranscriptProgress } from './getCloneTranscriptProgress';

/**
 * .what = whether a lead clone, found by serial, has sent and answered its first request
 * .why = a follower polls the lead; the lead's transcript may land after its own say linked
 *   history, so each read re-links it first
 * .note = not a pure read: `genCloneHistoryRelink` findserts the lead's `history/` symlinks first.
 *   the relink is idempotent (a transcript already linked is a no-op), so many followers that
 *   poll one lead converge on the same links. no socket is touched here; liveness is a probe
 *   asked apart, and only when it matters
 */
export const getOneLeadProgress = (input: {
  repoPath: string;
  serial: string;
}): { clone: CloneOndisk | null; started: boolean; answered: boolean } => {
  const clone = getOneCloneByRef({
    repoPath: input.repoPath,
    ref: { by: 'serial', serial: input.serial },
  });
  if (clone === null) return { clone, started: false, answered: false };
  genCloneHistoryRelink({ repoPath: input.repoPath, clone });
  const cloneDir = getCloneDir({
    actorDir: getActorOndiskDir({
      repoPath: clone.actor.repoPath,
      exid: clone.actor.exid,
    }),
    serial: clone.serial,
  });
  return { clone, ...getCloneTranscriptProgress({ cloneDir }) };
};
