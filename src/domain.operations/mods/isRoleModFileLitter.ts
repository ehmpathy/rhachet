import { posix } from 'node:path';

/**
 * .what = the os and editor files no author writes on purpose, by basename
 */
const LITTER_EXACT = new Set([
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini',
  '.gitkeep',
]);
const LITTER_SUFFIX = ['~'];

/**
 * .what = the vim swap file suffixes, `.swa` through `.swp`
 * .why = vim names a swap `.swp`, then steps back one letter per extra session (`.swo`, `.swn`)
 */
const LITTER_PATTERN_SWAP = /\.sw[a-p]$/;

/**
 * .what = whether a mod file is os or editor litter, never a brief or a skill
 * .why = a `.DS_Store` or a vim swap file in a mod dir is no change to the role; read as a mod
 *        file it would refuse the mod, and so fail every actor that carries the role
 *
 * .note = a closed set, so a real file is never skipped by a guess; a real dotfile brief
 *   (`briefs/.readme.md`) still shadows or adds
 */
export const isRoleModFileLitter = (input: { path: string }): boolean => {
  const name = posix.basename(input.path);
  return (
    LITTER_EXACT.has(name) ||
    LITTER_PATTERN_SWAP.test(name) ||
    LITTER_SUFFIX.some((suffix) => name.endsWith(suffix))
  );
};
