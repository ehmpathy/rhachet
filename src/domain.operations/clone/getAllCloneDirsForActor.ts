import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isCloneDirEntry } from './isCloneDirEntry';

/**
 * .what = the dir of every promoted clone of an actor
 * .why = the render readout and the resume each walk an actor's clones by dir, with no need to
 *        hydrate each identity (`getAllClonesForActor` does that, and drops a clone with none)
 * .note = a staged clone dir (`.serial=….tmp`) is left out: it is not yet a clone
 */
export const getAllCloneDirsForActor = (input: {
  actorDir: string;
}): string[] => {
  // no clones dir means no clone has spawned
  const clonesDir = join(input.actorDir, 'clones');
  if (!existsSync(clonesDir)) return [];

  // every promoted clone dir, by its path
  return readdirSync(clonesDir, { withFileTypes: true })
    .filter((entry) => isCloneDirEntry({ entry }))
    .map((entry) => join(clonesDir, entry.name));
};
