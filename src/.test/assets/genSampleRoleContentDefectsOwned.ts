import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';

/**
 * .what = one owned defect of each kind, the samples the receipt, the hold, and the warn read
 * .why = three renders read the same defects, so their snapshots line up row for row
 */
export const genSampleRoleContentDefectsOwned = (): RoleContentDefect[] => [
  {
    kind: 'orphan-min',
    ref: { repo: '.this', role: 'any' },
    pathToFile: '.agent/repo=.this/role=any/briefs/lost.md.min',
    detail: null,
  },
  {
    kind: 'boundary-literal',
    ref: { repo: '.this', role: 'any' },
    pathToFile: '.agent/repo=.this/role=any/briefs/core.md',
    detail: null,
  },
  {
    kind: 'spec-unparsed',
    ref: { repo: '.this', role: 'lint' },
    pathToFile: '.agent/repo=.this/role=lint/boot.yml',
    detail: 'boot.yml has invalid yaml',
  },
];
