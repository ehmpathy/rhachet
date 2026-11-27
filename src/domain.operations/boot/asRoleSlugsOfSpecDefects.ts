import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';

/**
 * .what = the role slugs whose boot spec a render refused
 * .why = such a role boots refs-only, so a focus on it is recorded but not yet in effect; the
 *        focus receipt reads this list, so it never claims a focus the boot did not apply
 */
export const asRoleSlugsOfSpecDefects = (input: {
  defects: RoleContentDefect[];
}): string[] => [
  ...new Set(
    input.defects
      .filter((defect) => defect.kind === 'spec-unparsed')
      .map((defect) => defect.ref.role),
  ),
];
