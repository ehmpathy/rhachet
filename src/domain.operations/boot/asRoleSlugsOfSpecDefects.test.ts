import { given, then, when } from 'test-fns';

import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';

import { asRoleSlugsOfSpecDefects } from './asRoleSlugsOfSpecDefects';

const DEFECTS: RoleContentDefect[] = [
  {
    kind: 'orphan-min',
    ref: { repo: '.this', role: 'any' },
    pathToFile: '.agent/repo=.this/role=any/briefs/lost.md.min',
    detail: null,
  },
  {
    kind: 'spec-unparsed',
    ref: { repo: '.this', role: 'lean' },
    pathToFile: '.agent/repo=.this/role=lean/boot.yml',
    detail: 'boot.yml has invalid yaml',
  },
  {
    kind: 'spec-unparsed',
    ref: { repo: 'ehmpathy', role: 'lean' },
    pathToFile: '.agent/repo=ehmpathy/role=lean/boot.yml',
    detail: null,
  },
];

describe('asRoleSlugsOfSpecDefects', () => {
  given('[case1] a set of defects of several kinds', () => {
    when('[t0] the slugs are read', () => {
      then('only roles whose spec was refused are named, each once', () => {
        expect(asRoleSlugsOfSpecDefects({ defects: DEFECTS })).toEqual([
          'lean',
        ]);
      });
    });
  });

  given('[case2] no defects', () => {
    when('[t0] the slugs are read', () => {
      then('none are named', () => {
        expect(asRoleSlugsOfSpecDefects({ defects: [] })).toEqual([]);
      });
    });
  });
});
