import { withAbsentAsNull } from '@src/infra/withAbsentAsNull';

import { lstatSync, readlinkSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join } from 'node:path';

/**
 * .what = the realpath a path would have, measured at its nearest extant ancestor
 * .why = a path not yet on disk lands wherever its ancestors' links lead, since a `mkdir -p`
 *   creates it through them. a guard that asks "does this land outside the repo?" must ask it
 *   before the path exists
 * .note = only an absent path walks up (`withAbsentAsNull`); every other errno surfaces
 * .note = a broken link is no absent name: it is followed to its target, which is where a write
 *   through it would land. a link loop throws ELOOP from realpath, never ENOENT, so it surfaces
 *   rather than walks
 */
export const getRealpathOfNearestExtant = (input: { path: string }): string => {
  const real = withAbsentAsNull({ read: () => realpathSync(input.path) });
  if (real) return real;

  // a broken link lands at its target, not at its own name
  if (lstatSync(input.path, { throwIfNoEntry: false })?.isSymbolicLink()) {
    const target = readlinkSync(input.path);
    return getRealpathOfNearestExtant({
      path: isAbsolute(target) ? target : join(dirname(input.path), target),
    });
  }

  // an absent name lands under its parent's realpath
  const parent = dirname(input.path);
  if (parent === input.path) return realpathSync(input.path);
  return join(
    getRealpathOfNearestExtant({ path: parent }),
    basename(input.path),
  );
};
