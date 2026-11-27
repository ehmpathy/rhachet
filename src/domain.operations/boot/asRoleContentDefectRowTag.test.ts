import { given, then, when } from 'test-fns';

import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';

import { asRoleContentDefectRowTag } from './asRoleContentDefectRowTag';

const asDefect = (input: { pathToFile: string }): RoleContentDefect => ({
  kind: 'orphan-min',
  ref: { repo: '.this', role: 'any' },
  pathToFile: input.pathToFile,
  detail: null,
});

const DEFECTS = [
  asDefect({ pathToFile: '.agent/repo=.this/role=any/briefs/a.md.min' }),
  asDefect({ pathToFile: '.agent/repo=.this/role=any/briefs/b.md.min' }),
  asDefect({ pathToFile: '.agent/repo=.this/role=anyway/briefs/c.md.min' }),
];

const TEST_CASES = [
  {
    description: 'a role with no defect carries no tag',
    given: { roleDir: '.agent/repo=.this/role=lint' },
    expect: '',
  },
  {
    description: 'a role with one defect is tagged in the singular',
    given: { roleDir: '.agent/repo=.this/role=anyway' },
    expect: '  🟡 1 role content defect set aside',
  },
  {
    description:
      'a role with two defects counts both, never a peer whose slug it prefixes',
    given: { roleDir: '.agent/repo=.this/role=any' },
    expect: '  🟡 2 role content defects set aside',
  },
];

describe('asRoleContentDefectRowTag', () => {
  given('[case1] the defects of a repo, and one roster row', () => {
    TEST_CASES.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        then('the tag counts the defects inside that role dir', () => {
          expect(
            asRoleContentDefectRowTag({
              defects: DEFECTS,
              roleDir: thisCase.given.roleDir,
            }),
          ).toEqual(thisCase.expect);
        });
      }),
    );
  });
});
