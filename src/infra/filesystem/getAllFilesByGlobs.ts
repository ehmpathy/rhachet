import glob from 'fast-glob';
import pm from 'picomatch';

import path from 'node:path';

/**
 * .what = get files by glob patterns with rsync-style precedence
 * .why = user includes can rescue files from default exclusions
 *
 * precedence (highest to lowest):
 *   1. user exclude → always excludes
 *   2. user include → rescues from default exclusions
 *   3. default exclude → applies unless user include matches
 *   4. default include → baseline
 */
export const getAllFilesByGlobs = async (input: {
  cwd: string;
  defaultInclude: string[];
  defaultExclude: string[];
  userInclude: string[];
  userExclude: string[];
}): Promise<string[]> => {
  // gather all candidate files (no exclusions yet)
  const allIncludes = [...input.defaultInclude, ...input.userInclude];
  const candidates = await glob(allIncludes, {
    cwd: input.cwd,
    absolute: true,
    dot: true, // include dotfiles in glob results
  });

  // build matchers (empty array = no match)
  const matchUserExclude = input.userExclude.length
    ? pm(input.userExclude, { dot: true })
    : () => false;
  const matchUserInclude = input.userInclude.length
    ? pm(input.userInclude, { dot: true })
    : () => false;
  const matchDefaultExclude = input.defaultExclude.length
    ? pm(input.defaultExclude, { dot: true })
    : () => false;

  // apply rsync-style precedence filter
  return candidates.filter((file) => {
    const rel = path.relative(input.cwd, file);

    // 1. user exclude → always excludes
    if (matchUserExclude(rel)) return false;

    // 2. user include → rescues from default exclusions
    if (matchUserInclude(rel)) return true;

    // 3. default exclude → applies
    if (matchDefaultExclude(rel)) return false;

    // 4. included by default
    return true;
  });
};
