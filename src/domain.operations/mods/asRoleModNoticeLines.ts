import type { RoleModPlan } from '@src/domain.objects/RoleModPlan';

import { asBriefPathLessMin } from './asBriefPathLessMin';

/**
 * .what = the notice atop a modded role's section of a boot
 * .why = the clone must know its role differs from the published one (usecase 4); a `not`
 *        leaves no resource to tag, so the notice lists each by path, and a shadow that hid a
 *        published minification says so
 *
 * .note = `of` is the role as the mod names it, with its declared version where one is set
 */
export const asRoleModNoticeLines = (input: {
  of: string;
  plan: RoleModPlan;
}): string[] => {
  const { plan } = input;
  const linesNot = plan.nots.map((path) => `[-] not ${path}`);
  const linesMin = plan.minsDropped
    .filter(
      (pathMin) => !plan.nots.includes(asBriefPathLessMin({ path: pathMin })),
    )
    .map(
      (pathMin) =>
        `[~] shadow ${asBriefPathLessMin({ path: pathMin })} drops the published ${pathMin}`,
    );
  return [
    `<mod of="${input.of}">`,
    `role ${input.of} is modded in this repo — ${plan.shadows.length} shadow, ${plan.adds.length} add, ${plan.nots.length} not`,
    ...linesNot,
    ...linesMin,
    '</mod>',
    '',
  ];
};
