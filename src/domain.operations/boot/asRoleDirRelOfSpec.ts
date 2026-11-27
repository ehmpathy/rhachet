import { dirname, relative } from 'node:path';

/**
 * .what = the role dir a boot spec sits in, relative to the cwd
 * .why = a defect names its file relative to the repo, so a roster row finds its role's defects
 *        by this same relative dir
 */
export const asRoleDirRelOfSpec = (input: {
  pathToSpec: string;
  cwd: string;
}): string => relative(input.cwd, dirname(input.pathToSpec));
