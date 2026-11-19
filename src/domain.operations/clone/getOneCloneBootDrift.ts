import { MalfunctionError } from 'helpful-errors';

import { asBootDelta } from '@src/domain.operations/boot/asBootDelta';
import { getActorBootCurrentPath } from '@src/domain.operations/boot/getActorBootCurrentPath';
import { getActorBootRevisionPaths } from '@src/domain.operations/boot/getActorBootRevisionPaths';
import { getOneBootDriftFileContent } from '@src/domain.operations/boot/getOneBootDriftFileContent';

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { CloneBootDrift } from './CloneBootDrift';
import { getOneCloneBootSpawnedRef } from './getOneCloneBootSpawnedRef';
import { CLONE_BOOT_SPAWNED_RESUMED_FILENAME } from './setCloneBootSpawnedResumed';

/**
 * .what = the boot drift of one clone: the revision it spawned on, and the delta from that
 *         revision to its actor's current boot, as the drift `CLAUDE.md` on disk holds it
 * .why = the drift nudge and `rhx clone boot drift --of` each answer "what has this clone not
 *        yet taken?"; one read serves both, so the two never disagree
 *
 * .note = a clone with no `boot.spawned.ref` spawned before boot drift: `legacy`, never an error
 * .note = a clone marked `boot.spawned.resumed` holds the boot its resumed session first
 *         recorded, which no ref names: `resumed`, never `current`
 * .note = the delta is re-computed from the revision's boot and the actor's boot, for its counts,
 *         then held against the drift on disk. a mismatch means the last render's fan-out did not
 *         reach this revision, so the clone would load a stale drift: that fails loud, with the
 *         path and the cure, never a quiet answer from the wrong file
 * .note = a render writes `boot.md` before it fans out the drifts, so a read inside that window
 *         also trips the stale check. the trip is held on purpose: the hook arm exits 1, which
 *         never blocks a stop, the inspector exits 1, and a re-run once the render ends reads
 *         clean, where a quiet answer would hand a clone a drift that does not match its boot
 * .note = each fault names its path: a ref that names a gone revision, an unreadable file
 */
export const getOneCloneBootDrift = (input: {
  actorDir: string;
  cloneDir: string;
}): CloneBootDrift => {
  // a resume holds the boot its session first recorded, which no ref names
  if (existsSync(join(input.cloneDir, CLONE_BOOT_SPAWNED_RESUMED_FILENAME)))
    return { kind: 'resumed' };

  // a clone that spawned before boot drift holds no ref
  const revision = getOneCloneBootSpawnedRef({ cloneDir: input.cloneDir });
  if (revision === null) return { kind: 'legacy' };

  // the revision the ref names, the actor's current boot, and the drift on disk
  const revisionPaths = getActorBootRevisionPaths({
    actorDir: input.actorDir,
    hash: revision,
  });
  const bootSpawned = getOneBootDriftFileContent({
    path: revisionPaths.bootMd,
  });
  const bootCurrent = getOneBootDriftFileContent({
    path: getActorBootCurrentPath({ actorDir: input.actorDir }),
  });
  const driftPath = revisionPaths.driftMd;
  const driftOnDisk = getOneBootDriftFileContent({ path: driftPath });

  // the drift on disk must be the drift the boots imply
  const delta = asBootDelta({ bootSpawned, bootCurrent });
  if ((delta.markdown ?? '') !== driftOnDisk)
    throw new MalfunctionError(
      'the boot drift on disk is stale: the last render did not reach it',
      {
        path: driftPath,
        hint: 'run `rhx init` to re-write every drift; if a render is in flight, re-run this once it ends',
      },
    );

  // no delta, or no drift hash to name it by: the clone is current
  const shape = {
    revision,
    lines: delta.lines,
    counts: delta.counts,
    outside: delta.outside,
  };
  if (delta.markdown === null || delta.drift === null)
    return { kind: 'current', drift: null, capped: false, ...shape };
  return {
    kind: 'drifted',
    drift: delta.drift,
    capped: delta.capped,
    ...shape,
  };
};
