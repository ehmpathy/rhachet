import { isPresent } from 'type-fns';

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { asBootSpawnedSerialFromDirName } from './asBootSpawnedSerialFromDirName';
import { BOOT_SPAWNED_FILENAMES } from './constants';
import { getActorBootSpawnedRootDir } from './getActorBootSpawnedRootDir';

/**
 * .what = the serial of every clone of an actor that holds a spawn boot, sorted
 * .why = the drift sweep writes one drift per clone; a stable order keeps its readout and its
 *        fault list the same run to run
 * .note = an actor with no `boots/` dir has no clone that spawned on a boot; an entry that is no
 *         spawn boot dir is left out
 * .note = a dir with no meta is no spawn boot yet: a spawn writes its boot, then its meta, so a
 *         sweep in that window would fault on a half-written dir
 */
export const getAllActorBootSpawnedSerials = (input: {
  actorDir: string;
}): string[] => {
  // no boots dir means no clone has spawned on a boot yet
  const rootDir = getActorBootSpawnedRootDir({ actorDir: input.actorDir });
  if (!existsSync(rootDir)) return [];

  // each spawn boot dir that holds its meta, by the serial its name carries
  return readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) =>
      existsSync(join(rootDir, entry.name, BOOT_SPAWNED_FILENAMES.metaJson)),
    )
    .map((entry) => asBootSpawnedSerialFromDirName({ name: entry.name }))
    .filter(isPresent)
    .sort();
};
