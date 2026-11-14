import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { discoverLinkedRoles } from '@src/domain.operations/role/discoverLinkedRoles';

import { asRoleRefSortOrder } from './asRoleRefSortOrder';
import { getAllNativeRoleRefs } from './getAllNativeRoleRefs';

/**
 * .what = every role linked under `.agent/`, native `.this` roles first, one ref per repo/role
 * .why = the one read of the linked set: enroll takes it as its default roleset, and a
 *        brain dir render looks its roles up in it
 *
 * .note = a native role joins the set only when it declares a `boot.yml`. the spec is the
 *   opt-in: a `.this` role dir with no spec is a folder of notes, never a booted role. the
 *   same spec is where the role opts into its budget, so one file marks a role as live
 * .note = package repos are read in code-unit order, so the set is the same on any fs
 * .note = two repos that ship one role slug both appear, each its own ref; neither is dropped
 *   (F11, requirements case 10)
 */
export const getAllLinkedRoleRefs = (
  _input: Record<string, never>,
  context: ContextCli,
): RoleLinkRef[] => {
  // the native roles that declare a spec, by slug
  const refsNative = getAllNativeRoleRefs({}, context);

  // the package roles, by repo/role in code-point order
  const refsPackage = discoverLinkedRoles({}, context).sort((a, b) =>
    asRoleRefSortOrder({ a, b }),
  );
  return [...refsNative, ...refsPackage];
};
