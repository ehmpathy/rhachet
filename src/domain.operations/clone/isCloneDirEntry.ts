import type { Dirent } from 'node:fs';
import { asCloneSerialFromDirName } from './asCloneSerialFromDirName';

/**
 * .what = whether a dir entry under `clones/` is a promoted clone dir
 * .why = a staged clone dir (`.serial=….tmp`), a stray file, or a stray dir is not a clone; one
 *        predicate owns that test, so each walk of an actor's clones reads the same set
 */
export const isCloneDirEntry = (input: { entry: Dirent }): boolean =>
  input.entry.isDirectory() &&
  asCloneSerialFromDirName({ dirName: input.entry.name }) !== null;
