import { given, then } from 'test-fns';

import { asClaudeMdExcludesOutsideDirs } from './asClaudeMdExcludesOutsideDirs';

const TEST_CASES = [
  {
    description: 'a pattern within an own dir is dropped',
    given: {
      excludes: ['/repo/.claude/CLAUDE.md', '/home/.claude/CLAUDE.md'],
      dirs: ['/repo/.claude'],
    },
    expect: ['/home/.claude/CLAUDE.md'],
  },
  {
    description: 'every reach path of the own doors is honored',
    given: {
      excludes: [
        '/repo/.agent/.actors/actor.via.repo=ambient/brain/.claude/CLAUDE.md',
        '/repo/.claude/CLAUDE.md',
        '/home/.claude/CLAUDE.md',
      ],
      dirs: [
        '/repo/.agent/.actors/actor.via.repo=ambient/brain/.claude',
        '/repo/.claude',
      ],
    },
    expect: ['/home/.claude/CLAUDE.md'],
  },
  {
    description: 'a dir that merely shares a prefix survives',
    given: {
      excludes: ['/repo/.claude-other/CLAUDE.md'],
      dirs: ['/repo/.claude'],
    },
    expect: ['/repo/.claude-other/CLAUDE.md'],
  },
  {
    description: 'a glob with no dir always survives',
    given: {
      excludes: ['**/CLAUDE.local.md'],
      dirs: ['/repo/.claude'],
    },
    expect: ['**/CLAUDE.local.md'],
  },
];

describe('asClaudeMdExcludesOutsideDirs', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      then('the survivors match', () => {
        expect(asClaudeMdExcludesOutsideDirs(thisCase.given)).toEqual(
          thisCase.expect,
        );
      });
    }),
  );
});
