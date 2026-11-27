import { given, then, when } from 'test-fns';

import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';

import { asRoleContentDefectLabels } from './asRoleContentDefectLabels';

const DEFECTS: RoleContentDefect[] = [
  {
    kind: 'orphan-min',
    ref: { repo: '.this', role: 'any' },
    pathToFile: '.agent/repo=.this/role=any/briefs/lost.md.min',
    detail: null,
  },
  {
    kind: 'spec-unparsed',
    ref: { repo: '.this', role: 'lint' },
    pathToFile: '.agent/repo=.this/role=lint/boot.yml',
    detail: 'boot.yml has invalid yaml',
  },
];

describe('asRoleContentDefectLabels', () => {
  given('[case1] no defects', () => {
    when('[t0] the labels are read', () => {
      then('no defects yield no labels', () => {
        expect(asRoleContentDefectLabels({ defects: [] })).toEqual([]);
      });
    });
  });

  given('[case2] two defects of different kinds', () => {
    when('[t0] the labels are read', () => {
      then('each defect reads as its path, then its kind, in order', () => {
        expect(asRoleContentDefectLabels({ defects: DEFECTS })).toEqual([
          '.agent/repo=.this/role=any/briefs/lost.md.min (orphan-min)',
          '.agent/repo=.this/role=lint/boot.yml (spec-unparsed)',
        ]);
      });
    });
  });
});
