import { ConstraintError } from 'helpful-errors';

import type {
  RoleModdedViewRecord,
  RoleModdedViewSource,
} from '@src/domain.objects/RoleModdedViewRecord';
import { getAllDirEntriesOrNone } from '@src/infra/filesystem/getAllDirEntriesOrNone';

import { lstatSync, readlinkSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { asRoleModdedViewRecordPath } from './asRoleModdedViewRecordPath';
import { isDirLink } from './isDirLink';

type ResourceKind = 'briefs' | 'skills';

/**
 * .what = the source a dir symlink names, relative to the role dir
 * .why = the link's own text, never the store realpath, so the source stays true across a
 *        store move
 */
const asSourceOfLink = (input: {
  roleDir: string;
  at: string;
  linkPath: string;
}): RoleModdedViewSource => ({
  at: input.at,
  target: relative(
    input.roleDir,
    resolve(dirname(input.linkPath), readlinkSync(input.linkPath)),
  ),
});

/**
 * .what = the published source dirs one kind dir of a role is built over
 * .why = a view is rebuilt from its sources; they are read from the links `roles link` made,
 *        or, once a modded view replaced those links, from the view's record
 *
 * .note = a kind dir that is a dir symlink is a single-dir link; one whose entries are dir
 *   symlinks is an array-dir link; aught else is a modded view (the record) or a native dir
 */
export const getAllRoleViewSources = (input: {
  roleDir: string;
  kind: ResourceKind;
  record: RoleModdedViewRecord | null;
}): RoleModdedViewSource[] => {
  const kindDir = resolve(input.roleDir, input.kind);
  const stats = lstatSync(kindDir, { throwIfNoEntry: false });
  if (!stats) return input.record?.sources[input.kind] ?? [];

  // a single-dir link mounts the source as the kind dir itself
  if (stats.isSymbolicLink())
    return [
      asSourceOfLink({ roleDir: input.roleDir, at: '', linkPath: kindDir }),
    ];

  // a file where the kind dir belongs is content no link made; a view built over it would drop it
  if (!stats.isDirectory())
    throw new ConstraintError('a linked role dir holds a file no link made', {
      kindDir,
      file: kindDir,
      fix: 'move the file out (to .agent/repo=.mods/ if it is a mod), then run rhx init --hooks',
    });

  // an array-dir link mounts each source as an entry of the kind dir
  //   a kind dir gone mid-walk (a render swap in flight) reads as no entries, so the record answers
  const entriesLinked = getAllDirEntriesOrNone({ dir: kindDir }).filter(
    (entry) => isDirLink({ path: resolve(kindDir, entry) }),
  );
  if (entriesLinked.length > 0)
    return entriesLinked.map((entry) =>
      asSourceOfLink({
        roleDir: input.roleDir,
        at: entry,
        linkPath: resolve(kindDir, entry),
      }),
    );

  // a modded view keeps its sources in its record; a native dir has none
  if (input.record) return input.record.sources[input.kind];

  // a dir of file links with no record is a modded view that lost its record; to read it as
  //   no sources would rebuild the role empty and drop the view
  if (hasFileLinkWithin({ dir: kindDir }))
    throw new ConstraintError(
      'a modded view of the role has no record of its published sources',
      {
        kindDir,
        record: asRoleModdedViewRecordPath({ roleDir: input.roleDir }),
        fix: `remove ${kindDir}, then run rhx init --hooks to link the role again`,
      },
    );
  return [];
};

/**
 * .what = whether a dir holds a file link at any depth
 * .why = a native dir holds files; a modded view holds links
 *
 * .note = a dir or entry gone mid-walk is no link, never a raw fs fault
 */
const hasFileLinkWithin = (input: { dir: string }): boolean =>
  getAllDirEntriesOrNone({ dir: input.dir }).some((entry) => {
    const path = join(input.dir, entry);
    const stats = lstatSync(path, { throwIfNoEntry: false });
    if (!stats) return false;
    if (stats.isSymbolicLink()) return true;
    return stats.isDirectory() && hasFileLinkWithin({ dir: path });
  });
