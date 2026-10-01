import { given, then, when } from 'test-fns';

import { isErrnoEexist } from './isErrnoEexist';

const TEST_CASES = [
  {
    description: 'an fs error for a path already taken',
    error: Object.assign(new Error('taken'), { code: 'EEXIST' }),
    expected: true,
  },
  {
    description: 'a plain object with code EEXIST (another vm realm)',
    error: { code: 'EEXIST' },
    expected: true,
  },
  {
    description: 'an fs error for an absent path',
    error: Object.assign(new Error('absent'), { code: 'ENOENT' }),
    expected: false,
  },
  {
    description: 'an error with no code',
    error: new Error('x'),
    expected: false,
  },
  { description: 'null', error: null, expected: false },
  { description: 'a string', error: 'EEXIST', expected: false },
] as const;

describe('isErrnoEexist', () => {
  TEST_CASES.map((thisCase) =>
    given(`[case] ${thisCase.description}`, () => {
      when('[t0] the error is checked', () => {
        then(`reads as ${thisCase.expected}`, () => {
          expect(isErrnoEexist(thisCase.error)).toEqual(thisCase.expected);
        });
      });
    }),
  );
});
