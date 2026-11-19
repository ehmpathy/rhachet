import { given, then } from 'test-fns';

import { isBrainCliSpawnArgsResume } from './isBrainCliSpawnArgsResume';

const TEST_CASES = [
  {
    description: 'a fresh spawn',
    given: ['--settings', 's.json'],
    expect: false,
  },
  {
    description: '--resume with an id',
    given: ['--resume', 'abc'],
    expect: true,
  },
  { description: '--resume=<id>', given: ['--resume=abc'], expect: true },
  { description: '-r with an id', given: ['-r', 'abc'], expect: true },
  { description: '--continue', given: ['--continue'], expect: true },
  { description: '-c', given: ['-c'], expect: true },
  {
    description: '--from-pr with a pr',
    given: ['--from-pr', '770'],
    expect: true,
  },
  { description: '--from-pr=<pr>', given: ['--from-pr=770'], expect: true },
  {
    description: '--session-id names a new session, no resume',
    given: ['--session-id', '0000aaaa-1111-2222-3333-444455556666'],
    expect: false,
  },
  {
    description: 'a prompt that merely names the word resume',
    given: ['-p', 'resume the work'],
    expect: false,
  },
];

describe('isBrainCliSpawnArgsResume', () => {
  given('[case1] each shape of spawn argv', () => {
    TEST_CASES.map((testCase) =>
      then(testCase.description, () => {
        expect(isBrainCliSpawnArgsResume({ args: testCase.given })).toEqual(
          testCase.expect,
        );
      }),
    );
  });
});
