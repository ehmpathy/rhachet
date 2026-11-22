import { MalfunctionError } from 'helpful-errors';

import { basename } from 'node:path';

/**
 * .what = the role slug a role dir names, e.g. `/repo/.agent/repo=.this/role=any` → `any`
 * .why = a role dir names its role in its last segment, after `role=`; one name for the read
 *        keeps the scans that walk role dirs legible
 *
 * .note = a dir whose last segment is no `role=<slug>` fails loud: a sliced basename would
 *   pass a plausible slug that names no role into a render
 */
export const asRoleSlugOfRoleDir = (input: { dir: string }): string => {
  const segment = basename(input.dir);
  const slug = segment.startsWith('role=') ? segment.slice('role='.length) : '';
  if (!slug)
    throw new MalfunctionError('a role dir must end in a role=<slug> segment', {
      dir: input.dir,
      hint: 'the scan that passed this dir matched past the role dirs; narrow its glob to `role=*`',
    });
  return slug;
};
