import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';

/**
 * .what = the tag a sweep roster row carries where its role holds content a boot set aside
 * .why = a hand-run `roles cost --all` reports and never gates, so a defect is a marked row, the
 *        way an over-budget spec is (`1.vision.experience.case=_` row 11)
 *
 * .note = `roleDir` is relative to the repo, as every `pathToFile` of a defect is
 * .note = a row with no defect carries no tag, so a clean roster reads as it always has
 */
export const asRoleContentDefectRowTag = (input: {
  defects: RoleContentDefect[];
  roleDir: string;
}): string => {
  const count = input.defects.filter((one) =>
    one.pathToFile.startsWith(`${input.roleDir}/`),
  ).length;
  if (count === 0) return '';
  return `  🟡 ${count} role content defect${count === 1 ? '' : 's'} set aside`;
};
