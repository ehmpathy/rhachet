import { given, then, when } from 'test-fns';

import { asRepoBrainDirMigrationPlan } from './asRepoBrainDirMigrationPlan';

const TEST_CASES = [
  {
    description: 'every src entry moves into an empty dst, and replaces naught',
    given: { entriesInSrc: ['settings.json', 'rules'], entriesInDst: [] },
    expect: { drops: [], moves: ['settings.json', 'rules'], overwrites: [] },
  },
  {
    description: 'a name in both dirs still moves, and is named an overwrite',
    given: {
      entriesInSrc: ['settings.json', 'rules'],
      entriesInDst: ['settings.json'],
    },
    expect: {
      drops: [],
      moves: ['settings.json', 'rules'],
      overwrites: ['settings.json'],
    },
  },
  {
    description:
      'the boot files drop, and never overwrite though dst holds them',
    given: {
      entriesInSrc: ['AGENTS.md', 'CLAUDE.md', 'boot.md'],
      entriesInDst: ['AGENTS.md', 'boot.md'],
    },
    expect: {
      drops: ['AGENTS.md', 'CLAUDE.md', 'boot.md'],
      moves: [],
      overwrites: [],
    },
  },
  {
    description: 'an empty src yields an empty plan',
    given: { entriesInSrc: [], entriesInDst: ['AGENTS.md'] },
    expect: { drops: [], moves: [], overwrites: [] },
  },
];

describe('asRepoBrainDirMigrationPlan', () => {
  given('[case1] a set of src and dst brain-dir entry lists', () => {
    TEST_CASES.map((thisCase) =>
      when(`[t0] ${thisCase.description}`, () => {
        then('it yields the expected migration plan', () => {
          expect(asRepoBrainDirMigrationPlan(thisCase.given)).toEqual(
            thisCase.expect,
          );
        });
      }),
    );
  });
});
