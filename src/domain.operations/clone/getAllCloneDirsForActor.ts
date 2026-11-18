import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { asCloneSerialFromDirName } from './asCloneSerialFromDirName';

/**
 * .what = the dir of every promoted clone of an actor
 * .why = the render readout and the resume each walk an actor's clones by dir, with no need to
 *        hydrate each identity (`getAllClonesForActor` does that, and drops a clone with none)
 * .note = a staged clone dir (`.serial=….tmp`) is left out: it is not yet a clone
 */
export const getAllCloneDirsForActor = (input: {
  actorDir: string;
}): string[] => {
  const clonesDir = join(input.actorDir, 'clones');
  if (!existsSync(clonesDir)) return [];
  return readdirSync(clonesDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        asCloneSerialFromDirName({ dirName: entry.name }) !== null,
    )
    .map((entry) => join(clonesDir, entry.name));
};
