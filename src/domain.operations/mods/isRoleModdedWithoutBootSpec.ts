import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { asRoleDir } from '@src/domain.operations/role/asRoleDir';

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getOneRoleModdedViewRecord } from './getOneRoleModdedViewRecord';

/**
 * .what = whether a linked role's dir holds no boot.yml, yet its view is modded
 * .why = a view record marks a modded view, refused or not; the absent spec is what leaves the
 *        role with no row in the cost roster
 */
export const isRoleModdedWithoutBootSpec = (input: {
  cwd: string;
  ref: RoleLinkRef;
}): boolean => {
  const roleDir = asRoleDir({ cwd: input.cwd, ref: input.ref });
  if (existsSync(join(roleDir, 'boot.yml'))) return false;
  return getOneRoleModdedViewRecord({ roleDir }) !== null;
};
