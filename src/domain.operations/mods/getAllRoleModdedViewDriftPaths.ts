import { getAllDirEntriesOrNone } from '@src/infra/filesystem/getAllDirEntriesOrNone';

import { lstatSync, readlinkSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';

/**
 * .what = every file link under a dir, by its role-relative path, to the path it names
 * .why = the view is links only; the drift check reads them without a follow
 */
const getAllViewLinks = (input: {
  roleDir: string;
  pathRel: string;
}): Array<[string, string]> => {
  const dir = join(input.roleDir, input.pathRel);
  const stats = lstatSync(dir, { throwIfNoEntry: false });
  if (!stats) return [];
  if (stats.isSymbolicLink())
    return [[input.pathRel, resolve(dirname(dir), readlinkSync(dir))]];
  if (!stats.isDirectory()) return [[input.pathRel, '']];
  return getAllDirEntriesOrNone({ dir }).flatMap((entry) =>
    getAllViewLinks({
      roleDir: input.roleDir,
      pathRel: posix.join(input.pathRel, entry),
    }),
  );
};

/**
 * .what = each role-relative path where the modded view on disk differs from the plan's links
 * .why = a view built before the mod changed (a file added, removed or renamed) would boot a
 *        role the mod no longer describes; the drift names each such path (F8)
 *
 * .note = an empty list is a fresh view
 * .note = one read, never a retry: a render swaps a kind dir by two renames, so a read made
 *   mid-swap can see drift that is not there. a writer holds the role view lock for the whole
 *   swap, so a boot that reads drift confirms it under that lock (`withRoleModReadConfirmed`),
 *   and the sync, which holds the lock already, reads once and trusts it
 */
export const getAllRoleModdedViewDriftPaths = (input: {
  roleDir: string;
  links: Map<string, string>;
}): string[] => {
  const actual = new Map(
    (['briefs', 'skills'] as const).flatMap((kind) =>
      getAllViewLinks({ roleDir: input.roleDir, pathRel: kind }),
    ),
  );
  const paths = new Set([...actual.keys(), ...input.links.keys()]);
  return [...paths]
    .filter((path) => {
      const target = input.links.get(path);
      return !target || actual.get(path) !== resolve(target);
    })
    .sort();
};
