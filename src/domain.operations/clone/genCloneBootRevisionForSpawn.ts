import { genActorBootRevision } from '../boot/genActorBootRevision';
import { BRAIN_CLI_BOOT_FLAG } from '../enroll/asBrainCliSpawnArgs';
import { asBrainCliSpawnArgsWithBootRevision } from '../enroll/asBrainCliSpawnArgsWithBootRevision';
import { isBrainCliSpawnArgsResume } from '../enroll/isBrainCliSpawnArgsResume';
import { delCloneStagedDir } from './delCloneStagedDir';
import { setCloneBootSpawnedRef } from './setCloneBootSpawnedRef';
import { setCloneBootSpawnedResumed } from './setCloneBootSpawnedResumed';

/**
 * .what = findsert the boot revision a clone spawns on, record its hash in the staged clone dir,
 *         and return the argv pointed at it
 * .why = the system prompt reads the revision's bytes, and its drift rides the revision's
 *        CLAUDE.md, which every later render of the actor re-writes. so the drift base and the
 *        system prompt are the same bytes, and the clone's ref names them
 *
 * .note = an argv that names no boot carries no boot to drift from: no revision, no ref
 * .note = an actor with no rendered boot has no revision: the argv passes through
 * .note = a resume replays the system prompt its session first recorded, so this spawn's
 *         revision is not the boot it holds: no ref is recorded, only a `resumed` marker, so no
 *         reader claims the clone is current. the carry of the prior session's ref is a dream
 *         (`dreams/v2026_11_17.feat.resume-carries-its-session-boot-revision.md`)
 * .note = a fault reaps the staged dir, as a spawn fault does in `genCloneOndisk`
 */
export const genCloneBootRevisionForSpawn = (input: {
  actorDir: string;
  stagedCloneDir: string;
  args: string[];
}): { args: string[] } => {
  // an argv that names no boot spawns as given
  if (!input.args.includes(BRAIN_CLI_BOOT_FLAG)) return { args: input.args };

  try {
    // a resume holds its session's boot, never this spawn's: mark it, record no ref
    if (isBrainCliSpawnArgsResume({ args: input.args })) {
      setCloneBootSpawnedResumed({ cloneDir: input.stagedCloneDir });
      return { args: input.args };
    }

    // the actor's current boot, findserted; none rendered → the argv as given
    const revision = genActorBootRevision({ actorDir: input.actorDir });
    if (revision === null) return { args: input.args };

    // record the revision by hash, then point the argv at it
    setCloneBootSpawnedRef({
      cloneDir: input.stagedCloneDir,
      hash: revision.hash,
    });
    return {
      args: asBrainCliSpawnArgsWithBootRevision({
        args: input.args,
        revisionDir: revision.revisionDir,
        revisionBootMdPath: revision.bootMdPath,
      }),
    };
  } catch (error) {
    delCloneStagedDir({ cloneDir: input.stagedCloneDir });
    throw error;
  }
};
