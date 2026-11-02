import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getOneRepoActorOndiskDir } from '@src/domain.operations/actor/enrolled/getOneRepoActorOndiskDir';

import { assertRepoActorBrainDirWritable } from './assertRepoActorBrainDirWritable';
import { assertRepoBrainDirSymlinkLandsHere } from './assertRepoBrainDirSymlinkLandsHere';

/**
 * .what = refuse, before any role links, a repo actor brain dir no role init may write through
 * .why = `rhx init --roles` and `rhx upgrade` both run role inits that write through
 *   `<repo>/.claude` into this dir. one this process cannot write (vision case 2), or a
 *   `<repo>/.claude` that lands elsewhere (vision case 4), would leave a part-way tree; each
 *   refusal names its cause instead (inventory case=10)
 * .note = runs after the layout step, so the dir and the link it probes are the ones the inits meet
 */
export const assertRepoActorBrainDirReadyForRoleInits = (input: {
  repoPath: string;
}): void => {
  const repoActorBrainDir = getBrainOndiskDir({
    actorDir: getOneRepoActorOndiskDir({ repoPath: input.repoPath }),
  });
  assertRepoActorBrainDirWritable({ repoActorBrainDir });
  assertRepoBrainDirSymlinkLandsHere({
    repoPath: input.repoPath,
    repoActorBrainDir,
  });
};
