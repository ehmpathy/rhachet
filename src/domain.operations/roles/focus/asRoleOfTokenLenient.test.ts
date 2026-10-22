import { given, then, when } from 'test-fns';

import { asRoleOfTokenLenient } from './asRoleOfTokenLenient';

const TEST_CASES: Array<{
  description: string;
  token: string;
  expect: string;
}> = [
  { description: 'a whole role', token: 'mechanic', expect: 'mechanic' },
  {
    description: 'a focused role',
    token: 'mechanic::flow',
    expect: 'mechanic',
  },
  {
    description: 'a malformed focus, which it lets through',
    token: 'mechanic::a::b',
    expect: 'mechanic',
  },
  { description: 'a focus with no role', token: '::flow', expect: '' },
];

describe('asRoleOfTokenLenient', () => {
  given('[case1] a role token', () => {
    TEST_CASES.forEach((thisCase) =>
      when(`[t0] ${thisCase.description}`, () => {
        then('it returns the role before the focus', () => {
          expect(asRoleOfTokenLenient({ token: thisCase.token })).toEqual(
            thisCase.expect,
          );
        });
      }),
    );
  });
});
