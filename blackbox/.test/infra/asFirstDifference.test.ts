import { given, then, when } from 'test-fns';

import { asFirstDifference } from './asFirstDifference';

const TEST_CASES = [
  {
    description: '[case1] two equal strings',
    given: { before: 'boot', after: 'boot', radius: 4 },
    outcome: 'there is no difference',
    expect: null,
  },
  {
    description: '[case2] two strings that differ in one char',
    given: { before: 'rendered at 09:14', after: 'rendered at 09:15', radius: 4 },
    outcome: 'it names the offset of the first char that differs, and both sides',
    expect: { offset: 16, before: '09:14', after: '09:15' },
  },
  {
    description: '[case3] one string a prefix of the other',
    given: { before: 'boot', after: 'boot.md', radius: 2 },
    outcome: 'the difference sits at the shorter length',
    expect: { offset: 4, before: 'ot', after: 'ot.m' },
  },
];

describe('asFirstDifference', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      when('[t0] the first difference is computed', () => {
        then(thisCase.outcome, () => {
          expect(asFirstDifference(thisCase.given)).toEqual(thisCase.expect);
        });
      });
    }),
  );
});
