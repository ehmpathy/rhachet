import { join } from 'node:path';
import { BOOT_REVISION_FILENAMES } from './constants';
import { getActorBootRevisionDir } from './getActorBootRevisionDir';

/**
 * .what = the dir of one boot revision and the paths of the two files it holds
 * .why = one owner for the revision layout, so the writer, the drift sweep, and the drift
 *        reader never join the file names on their own
 */
export const getActorBootRevisionPaths = (input: {
  actorDir: string;
  hash: string;
}): { dir: string; bootMd: string; driftMd: string } => {
  const dir = getActorBootRevisionDir(input);
  return {
    dir,
    bootMd: join(dir, BOOT_REVISION_FILENAMES.bootMd),
    driftMd: join(dir, BOOT_REVISION_FILENAMES.driftMd),
  };
};
