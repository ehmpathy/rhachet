import { getUuid } from 'uuid-fns';

import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';

import { genSampleCloneOndisk } from './genSampleCloneOndisk';

/**
 * .what = seed one actor with one clone; `live` makes the clone DEAF (a live pid), else DEAD
 * .why = the boot sweeps render an actor's brain dir only while a clone of it is active, so a
 *   case needs one of each reach state on demand
 *
 * .note = socketless + this live test process's pid → DEAF; a socket with no server → DEAD
 */
export const genSampleActorWithClone = async (input: {
  repoPath: string;
  roles: string[];
  live: boolean;
}): Promise<{ actorExid: string; actorDir: string; brainDir: string }> => {
  const seeded = await genSampleCloneOndisk({
    repoPath: input.repoPath,
    roles: input.roles,
    serial: getUuid(),
    slug: null,
    socketEligible: !input.live,
  });
  const actorDir = getActorOndiskDir({
    repoPath: seeded.repoPath,
    exid: seeded.actorExid,
  });
  return {
    actorExid: seeded.actorExid,
    actorDir,
    brainDir: getBrainOndiskDir({ actorDir }),
  };
};
