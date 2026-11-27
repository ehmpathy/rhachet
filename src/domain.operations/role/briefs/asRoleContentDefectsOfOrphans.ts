import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

import { relative } from 'node:path';
import type { RoleBriefRef } from './getRoleBriefRefs';

/**
 * .what = one `orphan-min` defect per orphan `.md.min` (one with no `.md` source beside it)
 * .why = an orphan is never a ref (`getRoleBriefRefs` builds refs from `.md` files alone), so a
 *        render that skips it loses naught. it is named, never thrown: a clone must be born to
 *        repair it (`rule.forbid.content-checks-that-halt-enroll`)
 */
export const asRoleContentDefectsOfOrphans = (input: {
  orphans: Array<Omit<RoleBriefRef, 'pathToOriginal'>>;
  ref: RoleLinkRef;
  cwd: string;
}): RoleContentDefect[] =>
  input.orphans
    .flatMap((orphan) => (orphan.pathToMinified ? [orphan.pathToMinified] : []))
    .map((pathToMinified) => ({
      kind: 'orphan-min' as const,
      ref: input.ref,
      pathToFile: relative(input.cwd, pathToMinified),
      detail: null,
    }));
