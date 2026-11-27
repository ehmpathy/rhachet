import { join } from 'node:path';
import { assertRoleKindDirLinksOnly } from './assertRoleKindDirLinksOnly';
import { ROLE_MOD_KINDS } from './constants';

/**
 * .what = refuse a role dir whose briefs or skills dir holds a regular file
 * .why = the render's view swap and the stop sweep check the same kind dirs, the same way
 */
export const assertRoleKindDirsLinksOnly = (input: {
  roleDir: string;
}): void => {
  for (const kind of ROLE_MOD_KINDS)
    assertRoleKindDirLinksOnly({ kindDir: join(input.roleDir, kind) });
};
