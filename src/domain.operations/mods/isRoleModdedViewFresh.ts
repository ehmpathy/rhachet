import type {
  RoleModdedViewHookBasis,
  RoleModdedViewRecord,
} from '@src/domain.objects/RoleModdedViewRecord';

import { getAllRoleModdedViewDriftPaths } from './getAllRoleModdedViewDriftPaths';
import { isRoleModHookBasisSame } from './isRoleModHookBasisSame';

/**
 * .what = whether a role's modded view on disk already holds the plan's links, and passed the
 *         hook check against the package installed now
 * .why = a fresh view is left as it is, so a live clone's skills stay in place
 *
 * .note = a view with no record, or whose last render refused, is never fresh
 * .note = a view whose hook basis moved (a package bump under a `not` of a skill) is never
 *   fresh, so the hook check runs again even where the file set is as it was (usecase 9)
 * .note = for a caller that holds the role view lock: it reads the view once, since no swap
 *   can be in flight. a caller with no lock confirms drift via `withRoleModReadConfirmed`
 */
export const isRoleModdedViewFresh = (input: {
  record: RoleModdedViewRecord | null;
  roleDir: string;
  links: Map<string, string>;
  hookBasis: RoleModdedViewHookBasis | null;
}): boolean => {
  if (!input.record || input.record.refusal) return false;
  if (
    !isRoleModHookBasisSame({
      recorded: input.record.hookBasis,
      needed: input.hookBasis,
    })
  )
    return false;
  const pathsDrifted = getAllRoleModdedViewDriftPaths({
    roleDir: input.roleDir,
    links: input.links,
  });
  return pathsDrifted.length === 0;
};
