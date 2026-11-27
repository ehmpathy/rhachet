import { given, then } from 'test-fns';

import { asRepoRelPathOfAgentPath } from './asRepoRelPathOfAgentPath';

const TEST_CASES = [
  {
    description: 'a path under .agent/ reads from .agent/',
    given: {
      path: '/home/surfer/repo/.agent/repo=test/role=surfer/briefs/notes.md',
    },
    expect: '.agent/repo=test/role=surfer/briefs/notes.md',
  },
  {
    description: 'a path under the mods dir reads from .agent/',
    given: { path: '/tmp/x/.agent/repo=.mods/role=surfer/boot.yml' },
    expect: '.agent/repo=.mods/role=surfer/boot.yml',
  },
  {
    description: 'a path with no .agent/ segment is returned as is',
    given: { path: '/home/surfer/repo/package.json' },
    expect: '/home/surfer/repo/package.json',
  },
  {
    description: 'a name that merely starts with .agent is no segment',
    given: { path: '/home/surfer/.agentx/notes.md' },
    expect: '/home/surfer/.agentx/notes.md',
  },
];

describe('asRepoRelPathOfAgentPath', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      then('it returns the expected path', () => {
        expect(asRepoRelPathOfAgentPath(thisCase.given)).toEqual(
          thisCase.expect,
        );
      });
    }),
  );
});
