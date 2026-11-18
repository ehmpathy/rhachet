import { asBootDriftFaultCause } from '@src/domain.operations/boot/asBootDriftFaultCause';
import type { BootDriftFault } from '@src/domain.operations/boot/BrainDirBootRender';
import { getActorBootRevisionDir } from '@src/domain.operations/boot/getActorBootRevisionDir';
import { getAllCloneBootSpawnedRefs } from '@src/domain.operations/clone/getAllCloneBootSpawnedRefs';

import { join } from 'node:path';

/**
 * .what = how many clones of an actor refer to a re-written boot revision, and each clone ref
 *         the drift cannot reach
 * .why = after a render, the editor asks "do my live clones get this?"; the boot layer knows
 *        the revisions, the clone layer knows the refs, and this join answers at init
 *
 * .note = a ref that names a revision no longer on disk is a fault: its clone takes no drift
 * .note = an unreadable ref is a fault of the sweep, never a throw past the drifts already
 *         written; a defect in the code still rethrows (`asBootDriftFaultCause`)
 */
export const getActorBootDriftReach = (input: {
  actorDir: string;
  revisions: string[];
  rewritten: string[];
}): { clones: number; faults: BootDriftFault[] } => {
  // the refs every clone of the actor holds; an unreadable one is a fault, not a throw
  const refs = getRefsOrFault({ actorDir: input.actorDir });

  // the clones whose revision was re-written: a live one takes the drift at its next compaction
  const clones = refs.hashes.filter((hash) =>
    input.rewritten.includes(hash),
  ).length;

  // a ref that names a gone revision: its clone cannot take any drift
  const refsGone = [...new Set(refs.hashes)].filter(
    (hash) => !input.revisions.includes(hash),
  );
  const faultsGone = refsGone.map((hash): BootDriftFault => {
    const revisionDir = getActorBootRevisionDir({
      actorDir: input.actorDir,
      hash,
    });
    return {
      revisionDir,
      reason: 'is gone, yet a clone refers to it — respawn that clone',
      cause: new Error(
        `a clone refers to a boot revision that is gone: ${revisionDir}`,
      ),
    };
  });

  return {
    clones,
    faults: [...faultsGone, ...(refs.fault === null ? [] : [refs.fault])],
  };
};

/**
 * .what = every clone ref of the actor, or the fault that stopped the read
 */
const getRefsOrFault = (input: {
  actorDir: string;
}): { hashes: string[]; fault: BootDriftFault | null } => {
  try {
    return {
      hashes: getAllCloneBootSpawnedRefs({ actorDir: input.actorDir }),
      fault: null,
    };
  } catch (error) {
    // a defect in the code rethrows; only a filesystem fault is collected
    const cause = asBootDriftFaultCause({ error });
    if (cause === null) throw error;
    return {
      hashes: [],
      fault: {
        revisionDir: join(input.actorDir, 'clones'),
        reason: `a spawn ref could not be read (${cause.message})`,
        cause,
      },
    };
  }
};
