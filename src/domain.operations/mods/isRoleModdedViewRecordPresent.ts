import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { asRoleDir } from '@src/domain.operations/role/asRoleDir';

import { existsSync } from 'node:fs';
import { asRoleModdedViewRecordPath } from './asRoleModdedViewRecordPath';

/**
 * .what = whether a linked role's dir holds a modded view record
 * .why = a record outlives its mod dir; the render finds such a view by it
 */
export const isRoleModdedViewRecordPresent = (input: {
  cwd: string;
  ref: RoleLinkRef;
}): boolean =>
  existsSync(
    asRoleModdedViewRecordPath({
      roleDir: asRoleDir({ cwd: input.cwd, ref: input.ref }),
    }),
  );
