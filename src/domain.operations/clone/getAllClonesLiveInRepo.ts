import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';
import { asCloneAddressHuman } from '@src/domain.operations/clone/asCloneAddressHuman';
import { getAllClonesGroupedByActor } from '@src/domain.operations/clone/getAllClonesGroupedByActor';
import { getCloneReachState } from '@src/domain.operations/clone/getCloneReachState';

/**
 * .what = the human address of each LIVE clone of this repo
 * .why = case=7 — `use` names the live sessions that still hold the prior account in memory
 * .note = per repo only: clones of other repos on the box are not enumerable from here, so the warn
 *   names what it can see and says "in this repo"
 */
export const getAllClonesLiveInRepo = async (input: {
  repoPath: string;
}): Promise<string[]> => {
  // every clone of every actor in this repo
  const clones = asClonesOfAllActors({
    groups: getAllClonesGroupedByActor({ repoPath: input.repoPath }),
  });

  // keep the clones whose socket answers
  const clonesLive = await getAllClonesLive({ clones });

  // address each for a human
  return clonesLive.map((clone) => asCloneAddressHuman(clone));
};

/**
 * .what = the clones of every actor group, as one list
 * .why = the reach check is per clone; the actor that owns it does not matter to the warn
 */
const asClonesOfAllActors = (input: {
  groups: ReturnType<typeof getAllClonesGroupedByActor>;
}): CloneOndisk[] => input.groups.flatMap((group) => group.clones);

/**
 * .what = the clones whose reach state reads LIVE
 * .why = only a live session holds a login in memory; a deaf or dead clone strands naught
 * .note = the reach checks run at once; each is a local socket probe, never a provider call
 */
const getAllClonesLive = async (input: {
  clones: CloneOndisk[];
}): Promise<CloneOndisk[]> => {
  // read each clone's reach, carried beside the clone it describes
  const clonesReached = await Promise.all(
    input.clones.map(async (clone) => ({
      clone,
      reach: await getCloneReachState({ clone }),
    })),
  );

  // keep the live ones
  return asClonesLiveOnly({ clonesReached });
};

/**
 * .what = the clones whose reach reads LIVE, apart from their reach
 * .why = the caller wants the clones; the reach was only the test
 */
const asClonesLiveOnly = (input: {
  clonesReached: { clone: CloneOndisk; reach: string }[];
}): CloneOndisk[] =>
  input.clonesReached
    .filter((reached) => reached.reach === 'LIVE')
    .map((reached) => reached.clone);
