import type { RoleModdedViewRecord } from '@src/domain.objects/RoleModdedViewRecord';

/**
 * .what = whether the plan's link paths match the paths the view was last built with
 * .why = a relink clears the view and the sync rebuilds it; where the plan is the same, the
 *        rebuild is a repair of the disk, never a mod change, so no live-clone notice is owed
 */
export const isRoleModdedViewPlanSame = (input: {
  record: RoleModdedViewRecord | null;
  links: Map<string, string>;
}): boolean => {
  if (!input.record || input.record.refusal) return false;
  const pathsNow = [...input.links.keys()].sort();
  const pathsBuilt = input.record.paths;
  return (
    pathsNow.length === pathsBuilt.length &&
    pathsNow.every((path, index) => path === pathsBuilt[index])
  );
};
