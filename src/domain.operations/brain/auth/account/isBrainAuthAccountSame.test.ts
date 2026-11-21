import { given, then, when } from 'test-fns';

import { BrainAuthAccount } from '@src/domain.objects/BrainAuthAccount';

import { isBrainAuthAccountSame } from './isBrainAuthAccountSame';

const accountA = new BrainAuthAccount({
  brain: 'claude',
  accountUuid: 'uuid-a',
  email: 'a@example.com',
  orgId: 'org-a',
});

const TEST_CASES = [
  {
    description: '[case1] the same uuid, email and org',
    given: { b: accountA },
    expect: { output: true },
  },
  {
    description: '[case2] another uuid',
    given: { b: new BrainAuthAccount({ ...accountA, accountUuid: 'uuid-b' }) },
    expect: { output: false },
  },
  {
    description: '[case3] another email',
    given: { b: new BrainAuthAccount({ ...accountA, email: 'b@example.com' }) },
    expect: { output: false },
  },
  {
    description: '[case4] another org',
    given: { b: new BrainAuthAccount({ ...accountA, orgId: 'org-b' }) },
    expect: { output: false },
  },
];

describe('isBrainAuthAccountSame', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      when('[t0] it is compared to account a', () => {
        then(`it reads ${thisCase.expect.output}`, () => {
          expect(
            isBrainAuthAccountSame({ a: accountA, b: thisCase.given.b }),
          ).toEqual(thisCase.expect.output);
        });
      });
    }),
  );
});
