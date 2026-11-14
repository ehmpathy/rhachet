import type { RoleModPlan } from '@src/domain.objects/RoleModPlan';

import { asBriefPathLessMin } from './asBriefPathLessMin';

/**
 * .what = whether one role-relative path in a modded view is a mod's shadow, its add, or the
 *         role's own
 * .why = each modded resource is tagged in the boot, so a clone can tell what this repo changed
 *        (usecase 4)
 *
 * .note = a minification takes its brief's provenance: the boot may render the `.md.min` of a
 *   modded `.md`, and the tag must follow the brief
 * .note = read from the plan the view was built from, which the freshness check has just
 *   proven equal to the links on disk
 */
export const getOneRoleModProvenance = (input: {
  plan: RoleModPlan;
  pathRel: string;
}): 'shadow' | 'add' | null => {
  const paths = [input.pathRel, asBriefPathLessMin({ path: input.pathRel })];
  if (paths.some((path) => input.plan.shadows.includes(path))) return 'shadow';
  if (paths.some((path) => input.plan.adds.includes(path))) return 'add';
  return null;
};
