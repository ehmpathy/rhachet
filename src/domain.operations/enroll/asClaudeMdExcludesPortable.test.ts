import { given, then, when } from 'test-fns';

import { asClaudeMdExcludesPortable } from './asClaudeMdExcludesPortable';

const TEST_CASES = [
  {
    description: 'keeps every glob, in order',
    given: {
      excludes: ['**/!(brain)/.claude/CLAUDE.md', '**/CLAUDE.local.md'],
    },
    expect: ['**/!(brain)/.claude/CLAUDE.md', '**/CLAUDE.local.md'],
  },
  {
    description: 'drops every absolute path, which names one machine',
    given: {
      excludes: [
        '/home/camper/.claude/CLAUDE.md',
        '**/!(brain)/.claude/CLAUDE.md',
        '/repo/.claude/CLAUDE.md',
        '**/CLAUDE.local.md',
      ],
    },
    expect: ['**/!(brain)/.claude/CLAUDE.md', '**/CLAUDE.local.md'],
  },
  {
    description: 'an empty list stays empty',
    given: { excludes: [] },
    expect: [],
  },
];

describe('asClaudeMdExcludesPortable', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the excludes are made portable', () => {
        then(`it returns ${JSON.stringify(thisCase.expect)}`, () => {
          expect(asClaudeMdExcludesPortable(thisCase.given)).toEqual(
            thisCase.expect,
          );
        });
      });
    }),
  );
});
