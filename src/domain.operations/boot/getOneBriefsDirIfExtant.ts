import { ConstraintError } from 'helpful-errors';

import { type Stats, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = the errnos a caller can repair on a briefs dir probe — a permission they can
 *         grant, or a symlink cycle they can break
 */
const ERRNOS_CALLER_FIXABLE = new Set(['EACCES', 'EPERM', 'ELOOP']);

/**
 * .what = `<rootDir>/briefs` where that directory exists, else null
 * .why = the LAYOUT decides a boot's brief universe, never the arm that read the spec. a role
 *        dir has a `briefs/` subdir and scopes to it; a route dir has none, so its whole
 *        `rootDir` stays the universe (see `BootSource.dirBriefs`)
 *
 * .note = an absence returns null. a caller-fixable errno is lifted to a `ConstraintError`
 *   (exit 2), the same closed set `getOneManifestPathStat` lifts; every other fault escapes
 *   unchanged
 */
export const getOneBriefsDirIfExtant = (input: {
  rootDir: string;
}): string | null => {
  const dirCandidate = join(input.rootDir, 'briefs');
  const stats = ((): Stats | undefined => {
    try {
      return statSync(dirCandidate, { throwIfNoEntry: false });
    } catch (error: unknown) {
      const code = (error as NodeJS.ErrnoException).code;
      if (!code || !ERRNOS_CALLER_FIXABLE.has(code)) throw error;
      throw new ConstraintError('the briefs dir is not readable', {
        path: dirCandidate,
        why: `the filesystem refused the read (${code})`,
        hint: 'grant read access to the briefs dir and every dir above it, or break its symlink cycle',
      });
    }
  })();
  return stats?.isDirectory() ? dirCandidate : null;
};
