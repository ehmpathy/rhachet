import { given, then, when } from 'test-fns';

import { isErrnoEnoent } from './isErrnoEnoent';

const TEST_CASES = [
  {
    description: 'an fs error for an absent path',
    error: Object.assign(new Error('absent'), { code: 'ENOENT' }),
    expected: true,
  },
  {
    description: 'a plain object with code ENOENT (another vm realm)',
    error: { code: 'ENOENT' },
    expected: true,
  },
  {
    description: 'an fs error for a denied path',
    error: Object.assign(new Error('denied'), { code: 'EACCES' }),
    expected: false,
  },
  {
    description: 'an error with no code',
    error: new Error('x'),
    expected: false,
  },
  { description: 'null', error: null, expected: false },
  { description: 'a string', error: 'ENOENT', expected: false },
] as const;

describe('isErrnoEnoent', () => {
  TEST_CASES.map((thisCase) =>
    given(`[case] ${thisCase.description}`, () => {
      when('[t0] the error is checked', () => {
        then(`reads as ${thisCase.expected}`, () => {
          expect(isErrnoEnoent(thisCase.error)).toEqual(thisCase.expected);
        });
      });
    }),
  );
});
