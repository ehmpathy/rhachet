import { isAbsolute } from 'node:path';

/**
 * .what = the claudeMdExcludes patterns that hold on any machine — the globs, never an
 *         absolute path
 * .why = the repo actor's settings file is committed, and an absolute entry names one checkout
 *        or one home (rule.forbid.machine-names-in-committed-config). the portable globs alone
 *        go into git
 */
export const asClaudeMdExcludesPortable = (input: {
  excludes: string[];
}): string[] => input.excludes.filter((pattern) => !isAbsolute(pattern));
