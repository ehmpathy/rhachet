import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';

/**
 * .what = one linked orphan, a defect this repo cannot repair
 * .why = the warn and the receipt name a linked defect with the supplier levers, never a hold
 */
export const genSampleRoleContentDefectsLinked = (): RoleContentDefect[] => [
  {
    kind: 'orphan-min',
    ref: { repo: 'ehmpathy', role: 'mechanic' },
    pathToFile: '.agent/repo=ehmpathy/role=mechanic/briefs/gone.md.min',
    detail: null,
  },
];
