import { delActorBootSpawned } from '../boot/delActorBootSpawned';
import { genActorBootSpawned } from '../boot/genActorBootSpawned';
import { BRAIN_CLI_BOOT_FLAG } from '../enroll/asBrainCliSpawnArgs';
import { asBrainCliSpawnArgsWithBootSpawned } from '../enroll/asBrainCliSpawnArgsWithBootSpawned';
import { isBrainCliSpawnArgsResume } from '../enroll/isBrainCliSpawnArgsResume';
import { delCloneStagedDir } from './delCloneStagedDir';
import { setCloneBootSpawnedResumed } from './setCloneBootSpawnedResumed';

/**
 * .what = write the boot a clone spawns on, keyed by its serial, and return the argv pointed at it
 * .why = the system prompt reads the spawn boot's bytes, and its drift rides the `CLAUDE.md`
 *        beside them, which every later render of the actor re-writes. so the drift base and the
 *        system prompt are the same bytes, and the clone owns both
 *
 * .note = an argv that names no boot carries no boot to drift from: no spawn boot
 * .note = an actor with no rendered boot has no spawn boot: the argv passes through
 * .note = a resume replays the system prompt its session first recorded, so this spawn's boot is
 *         not the boot it holds: no spawn boot is written, only a `resumed` marker, so no reader
 *         claims the clone is current. the carry of the prior session's boot is a dream
 *         (`dreams/v2026_11_17.feat.resume-carries-its-session-boot-revision.md`)
 * .note = a fault reaps the staged dir and the spawn boot, as a spawn fault does in
 *         `genCloneOndisk`
 */
export const genCloneBootSpawnedForSpawn = (input: {
  actorDir: string;
  serial: string;
  stagedCloneDir: string;
  args: string[];
}): { args: string[] } => {
  // an argv that names no boot spawns as given
  if (!input.args.includes(BRAIN_CLI_BOOT_FLAG)) return { args: input.args };

  try {
    // a resume holds its session's boot, never this spawn's: mark it, write no spawn boot
    if (isBrainCliSpawnArgsResume({ args: input.args })) {
      setCloneBootSpawnedResumed({ cloneDir: input.stagedCloneDir });
      return { args: input.args };
    }

    // the actor's current boot, written as this clone's own; none rendered → the argv as given
    const bootSpawned = genActorBootSpawned({
      actorDir: input.actorDir,
      serial: input.serial,
    });
    if (bootSpawned === null) return { args: input.args };

    // point the argv at it
    return {
      args: asBrainCliSpawnArgsWithBootSpawned({
        args: input.args,
        bootSpawnedDir: bootSpawned.dir,
        bootSpawnedMdPath: bootSpawned.bootMdPath,
      }),
    };
  } catch (error) {
    delActorBootSpawned({ actorDir: input.actorDir, serial: input.serial });
    delCloneStagedDir({ cloneDir: input.stagedCloneDir });
    throw error;
  }
};
