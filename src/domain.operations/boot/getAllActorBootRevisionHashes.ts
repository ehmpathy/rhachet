import { isPresent } from 'type-fns';

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { asBootRevisionHashFromDirName } from './asBootRevisionHashFromDirName';
import { BOOT_REVISION_FILENAMES } from './constants';
import { getActorBootRevisionsRootDir } from './getActorBootRevisionsRootDir';

/**
 * .what = the hash of every boot revision an actor holds, sorted
 * .why = the drift sweep writes one drift per revision; a stable order keeps its readout and its
 *        fault list the same run to run
 * .note = an actor with no `boots/` dir holds no revision; an entry that is no revision dir is
 *         left out
 * .note = a dir with no `boot.md` is no revision: a crash or a concurrent spawn can leave one
 *         between its `mkdir` and its write, and a sweep over it would fault on every init
 */
export const getAllActorBootRevisionHashes = (input: {
  actorDir: string;
}): string[] => {
  // no boots dir means no clone has spawned on a revision yet
  const rootDir = getActorBootRevisionsRootDir({ actorDir: input.actorDir });
  if (!existsSync(rootDir)) return [];

  // each revision dir that holds its boot, by the hash its name carries
  return readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) =>
      existsSync(join(rootDir, entry.name, BOOT_REVISION_FILENAMES.bootMd)),
    )
    .map((entry) => asBootRevisionHashFromDirName({ name: entry.name }))
    .filter(isPresent)
    .sort();
};
