import { asBootDriftFaultCause } from '@src/domain.operations/boot/asBootDriftFaultCause';
import type {
  BootDriftFault,
  BootDriftReach,
} from '@src/domain.operations/boot/BrainDirBootRender';
import { getAllActorBootRevisionHashes } from '@src/domain.operations/boot/getAllActorBootRevisionHashes';
import { getAllCloneBootSpawnedRefs } from '@src/domain.operations/clone/getAllCloneBootSpawnedRefs';

import { join } from 'node:path';
import { asCountOfRefsInRevisions } from './asCountOfRefsInRevisions';
import { asRefsGoneFromRevisions } from './asRefsGoneFromRevisions';

/**
 * .what = how many clones of an actor refer to a re-written boot revision, and each clone ref
 *         the drift cannot reach
 * .why = after a render, the editor asks "do my live clones get this?"; the boot layer knows
 *        the revisions, the clone layer knows the refs, and this join answers at init
 *
 * .note = a ref that names a revision no longer on disk is `gone`, a row and never a fault: its
 *         clone takes no drift, but a dead one needs a prune, not an exit 1 on every init
 * .note = the revisions are read from disk here, at the join, after the refs: a clone spawned
 *         after the sweep holds a revision the sweep never listed, and must not read as gone
 * .note = an unreadable ref is a fault of the sweep, never a throw past the drifts already
 *         written; a defect in the code still rethrows (`asBootDriftFaultCause`)
 * .note = `clones` is null where a ref read faulted: the count is unknown, never a false zero
 */
export const getOneActorBootDriftReach = (input: {
  actorDir: string;
  rewritten: string[];
}): BootDriftReach => {
  // the refs every clone of the actor holds; an unreadable one is a fault, not a throw
  const refs = getOneRefsOrFault({ actorDir: input.actorDir });

  // the revisions on disk now, read after the refs, so every ref read names a revision listed
  const revisions = getAllActorBootRevisionHashes({ actorDir: input.actorDir });

  // the clones whose revision was re-written: a live one takes the drift at its next compaction
  const clones = asCountOfRefsInRevisions({
    refs: refs.hashes,
    revisions: input.rewritten,
  });

  // a ref that names a gone revision: its clone cannot take any drift
  const gone = asRefsGoneFromRevisions({ refs: refs.hashes, revisions });

  // a ref read that faulted leaves each count unknown, never a false zero
  const isRead = refs.faults.length === 0;
  return {
    clones: isRead ? clones : null,
    unreached: isRead ? refs.unreached : null,
    gone,
    faults: refs.faults,
  };
};

/**
 * .what = every clone ref of the actor, or the fault that stopped the read
 */
const getOneRefsOrFault = (input: {
  actorDir: string;
}): { hashes: string[]; unreached: number; faults: BootDriftFault[] } => {
  try {
    return {
      ...getAllCloneBootSpawnedRefs({ actorDir: input.actorDir }),
      faults: [],
    };
  } catch (error) {
    // a defect in the code rethrows; only a filesystem fault is collected
    const cause = asBootDriftFaultCause({ error });
    if (cause === null) throw error;
    return {
      hashes: [],
      unreached: 0,
      faults: [
        {
          path: join(input.actorDir, 'clones'),
          reason: `a spawn ref could not be read (${cause.message})`,
          cause,
        },
      ],
    };
  }
};
