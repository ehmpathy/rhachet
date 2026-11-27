import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

import { relative } from 'node:path';
import type { BootSayResource } from './getAllBootSayResources';
import {
  BOOT_CACHE_BOUNDARY_DEFANGED,
  BOOT_CACHE_BOUNDARY_LINE,
} from './getOneBootCacheBoundary';

/**
 * .what = replace each copy of the cache boundary literal in a role's said files, and name
 *         each file that held one as a `boundary-literal` defect
 * .why = only the render places the boundary. a copy inside a role file would split the cache
 *        at the wrong place, yet a refusal would halt a clone birth over content the clone can
 *        repair (`rule.forbid.content-checks-that-halt-enroll`). defanged, the file still renders
 */
export const asBootSayResourcesDefanged = (input: {
  said: BootSayResource[];
  ref: RoleLinkRef;
  cwd: string;
}): { said: BootSayResource[]; defects: RoleContentDefect[] } => {
  // find each said file that holds the literal
  const isHolder = (one: BootSayResource) =>
    one.content.includes(BOOT_CACHE_BOUNDARY_LINE);
  const defects: RoleContentDefect[] = input.said
    .filter(isHolder)
    .map((one) => ({
      kind: 'boundary-literal',
      ref: input.ref,
      pathToFile: relative(input.cwd, one.pathToLabel),
      detail: null,
    }));

  // replace every copy in each holder; the rest pass unchanged
  const said = input.said.map((one) =>
    isHolder(one)
      ? {
          ...one,
          content: one.content
            .split(BOOT_CACHE_BOUNDARY_LINE)
            .join(BOOT_CACHE_BOUNDARY_DEFANGED),
        }
      : one,
  );
  return { said, defects };
};
