import { join } from 'node:path';
import { BOOT_SPAWNED_DIR_PREFIX, BOOT_SPAWNED_FILENAMES } from './constants';
import { getActorBootSpawnedRootDir } from './getActorBootSpawnedRootDir';

/**
 * .what = the spawn boot dir of one clone, `<actor>/boots/serial=<serial>/`, and the paths of the
 *         three files it holds
 * .why = one owner for the layout, so the writer, the drift sweep, the drift reader, and the reap
 *        never join the file names on their own
 * .note = the boot is the clone's own: the bytes of the instant it spawned, so it lives and dies
 *         with that one clone, keyed by its serial
 */
export const getActorBootSpawnedPaths = (input: {
  actorDir: string;
  serial: string;
}): { dir: string; bootMd: string; metaJson: string; driftMd: string } => {
  const dir = join(
    getActorBootSpawnedRootDir({ actorDir: input.actorDir }),
    `${BOOT_SPAWNED_DIR_PREFIX}${input.serial}`,
  );
  return {
    dir,
    bootMd: join(dir, BOOT_SPAWNED_FILENAMES.bootMd),
    metaJson: join(dir, BOOT_SPAWNED_FILENAMES.metaJson),
    driftMd: join(dir, BOOT_SPAWNED_FILENAMES.driftMd),
  };
};
