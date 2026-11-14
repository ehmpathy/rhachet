import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleBootSpec } from '@src/domain.objects/RoleBootSpec';
import type { RoleDelta } from '@src/domain.objects/RoleDelta';
import { assertRoleFocusDeclared } from '@src/domain.operations/boot/assertRoleFocusDeclared';
import { getAllLinkedRoleRefs } from '@src/domain.operations/role/getAllLinkedRoleRefs';
import { getOneRoleBootSpecFromRef } from '@src/domain.operations/role/getOneRoleBootSpecFromRef';
import { parseRoleBootYaml } from '@src/domain.operations/role/parseRoleBootYaml';
import { readOneBootSpecFile } from '@src/domain.operations/role/readOneBootSpecFile';
import { getAllRoleFociOfDeltas } from '@src/domain.operations/roles/focus/getAllRoleFociOfDeltas';
import { isRoleLinkRefOfRole } from '@src/domain.operations/roles/isRoleLinkRefOfRole';

import { getRolesFoundFromSlugs } from './link/getRolesFoundFromSlugs';

/**
 * .what = refuses any focus an `rhx init --roles` delta names that its role does not declare
 * .why = init writes the brain dir layout, links roles, records the ambient foci and patches
 *        `prepare:rhachet`. a typo in a focus must halt before the first of those, so the repo
 *        is left as it was found
 *
 * .note = a role already linked reads its linked spec; a role this init will link for the
 *         first time reads the spec its package manifest declares, so no link precedes the check
 * .note = only the foci this delta names are checked here; a focus recorded by an earlier init
 *         was checked then, and the render checks every focus again
 */
export const assertInitRoleFociDeclared = async (
  input: { deltas: RoleDelta[] },
  context: ContextCli,
): Promise<void> => {
  // the focused entries this delta names; a whole role needs no check
  const focused = getAllRoleFociOfDeltas({ deltas: input.deltas });
  if (focused.length === 0) return;

  // read each focused role's spec, from its link if held, else from its package manifest
  const refsLinked = getAllLinkedRoleRefs({}, context);
  for (const entry of focused) {
    // a bare slug that two repos share names both roles, so the focus must hold on each
    const refsOfRole = refsLinked.filter((ref) =>
      isRoleLinkRefOfRole({ ref, role: entry.role }),
    );
    const configs =
      refsOfRole.length > 0
        ? refsOfRole.map((ref) =>
            getOneRoleBootSpecFromRef({ ref, repoPath: context.gitroot }),
          )
        : [
            await getOneRoleBootSpecFromPackage(
              { specifier: entry.role },
              context,
            ),
          ];
    for (const config of configs)
      assertRoleFocusDeclared({
        slugRole: entry.role,
        subjects: entry.subjects,
        config,
        focusFrom: 'typed.init',
      });
  }
};

/**
 * .what = the boot spec a role's package manifest declares, or null where it declares none
 * .why = a role not yet linked has no spec under `.agent/`; its package already names one
 */
const getOneRoleBootSpecFromPackage = async (
  input: { specifier: string },
  context: ContextCli,
): Promise<RoleBootSpec | null> => {
  const { found } = await getRolesFoundFromSlugs(
    { slugs: [input.specifier] },
    context,
  );
  const pathToSpec = found[0]?.role.boot?.uri ?? null;
  if (pathToSpec === null) return null;
  return parseRoleBootYaml({
    content: readOneBootSpecFile({ pathToSpec }),
    path: pathToSpec,
  });
};
