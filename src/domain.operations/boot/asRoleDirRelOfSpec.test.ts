import { given, then, when } from 'test-fns';

import { asRoleDirRelOfSpec } from './asRoleDirRelOfSpec';

const TEST_CASES = [
  {
    description: 'a spec under the cwd names its role dir relative to the cwd',
    given: {
      pathToSpec: '/repo/.agent/repo=.this/role=any/boot.yml',
      cwd: '/repo',
    },
    expect: { output: '.agent/repo=.this/role=any' },
  },
  {
    description: 'a linked role spec names its own role dir',
    given: {
      pathToSpec: '/repo/.agent/repo=ehmpathy/role=mechanic/boot.yml',
      cwd: '/repo',
    },
    expect: { output: '.agent/repo=ehmpathy/role=mechanic' },
  },
];

describe('asRoleDirRelOfSpec', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the transformer runs', () => {
        then('it returns the expected role dir', () => {
          expect(asRoleDirRelOfSpec(thisCase.given)).toEqual(
            thisCase.expect.output,
          );
        });
      });
    }),
  );
});
