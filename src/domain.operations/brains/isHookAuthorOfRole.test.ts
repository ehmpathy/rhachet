import { isHookAuthorOfRole } from './isHookAuthorOfRole';

const TEST_CASES = [
  { author: 'repo=ehmpathy/role=mechanic', expected: true },
  { author: 'repo=.this/role=any', expected: true },
  { author: 'rhachet/hooks.dispatch', expected: false },
  { author: 'human', expected: false },
  { author: 'role=mechanic', expected: false },
  { author: 'repo=ehmpathy', expected: false },
  { author: '', expected: false },
];

describe('isHookAuthorOfRole', () => {
  TEST_CASES.map((thisCase) =>
    test(`'${thisCase.author}' → ${thisCase.expected}`, () => {
      expect(isHookAuthorOfRole({ author: thisCase.author })).toEqual(
        thisCase.expected,
      );
    }),
  );
});
