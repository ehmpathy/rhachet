import { MalfunctionError } from 'helpful-errors';

import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { asBootDelta } from '@src/domain.operations/boot/asBootDelta';
import { BRAIN_DIR_BOOT_FILENAMES } from '@src/domain.operations/boot/constants';
import { getActorBootRevisionDir } from '@src/domain.operations/boot/getActorBootRevisionDir';

import { join } from 'node:path';
import { getCloneBootDriftFileContent } from './getCloneBootDriftFileContent';
import { getCloneBootSpawnedRef } from './getCloneBootSpawnedRef';

/**
 * .what = the boot drift of one clone: the revision it spawned on, and the delta from that
 *         revision to its actor's current boot, as the drift `CLAUDE.md` on disk holds it
 * .why = the drift nudge and `rhx clone boot drift --of` each answer "what has this clone not
 *        yet taken?"; one read serves both, so the two never disagree
 *
 * .note = a clone with no `boot.spawned.ref` spawned before boot drift: `legacy`, never an error
 * .note = the delta is re-computed from the revision's boot and the actor's boot, for its counts,
 *         then held against the drift on disk. a mismatch means the last render's fan-out did not
 *         reach this revision, so the clone would load a stale drift: that fails loud, with the
 *         path and the cure, never a quiet answer from the wrong file
 * .note = each fault names its path: a ref that names a gone revision, an unreadable file
 */
export const getCloneBootDrift = (input: {
  actorDir: string;
  cloneDir: string;
}):
  | { kind: 'legacy' }
  | {
      kind: 'current' | 'drifted';
      revision: string;
      drift: string | null;
      lines: number;
      counts: { changed: number; added: number; removed: number };
      outside: boolean;
    } => {
  // a clone that spawned before boot drift holds no ref
  const revision = getCloneBootSpawnedRef({ cloneDir: input.cloneDir });
  if (revision === null) return { kind: 'legacy' };

  // the revision the ref names, the actor's current boot, and the drift on disk
  const revisionDir = getActorBootRevisionDir({
    actorDir: input.actorDir,
    hash: revision,
  });
  const bootSpawned = getCloneBootDriftFileContent({
    path: join(revisionDir, BRAIN_DIR_BOOT_FILENAMES.bootMd),
  });
  const bootCurrent = getCloneBootDriftFileContent({
    path: join(
      getBrainOndiskDir({ actorDir: input.actorDir }),
      BRAIN_DIR_BOOT_FILENAMES.bootMd,
    ),
  });
  const driftPath = join(revisionDir, BRAIN_DIR_BOOT_FILENAMES.claudeMd);
  const driftOnDisk = getCloneBootDriftFileContent({ path: driftPath });

  // the drift on disk must be the drift the boots imply
  const delta = asBootDelta({ bootSpawned, bootCurrent });
  if ((delta.markdown ?? '') !== driftOnDisk)
    throw new MalfunctionError(
      'the boot drift on disk is stale: the last render did not reach it',
      { path: driftPath, hint: 'run `rhx init` to re-write every drift' },
    );

  return {
    kind: delta.markdown === null ? 'current' : 'drifted',
    revision,
    drift: delta.drift,
    lines: delta.lines,
    counts: delta.counts,
    outside: delta.outside,
  };
};
