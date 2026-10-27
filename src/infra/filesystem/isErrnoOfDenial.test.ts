import { given, then } from 'test-fns';

import { genSampleErrnoError } from '@src/.test/assets/genSampleErrnoError';

import { isErrnoOfDenial } from './isErrnoOfDenial';

const TEST_CASES = [
  {
    description: 'EACCES',
    error: genSampleErrnoError({ code: 'EACCES' }),
    expected: true,
  },
  {
    description: 'EPERM',
    error: genSampleErrnoError({ code: 'EPERM' }),
    expected: true,
  },
  {
    description: 'EROFS',
    error: genSampleErrnoError({ code: 'EROFS' }),
    expected: true,
  },
  {
    description: 'ENOENT',
    error: genSampleErrnoError({ code: 'ENOENT' }),
    expected: false,
  },
  { description: 'a bare error', error: new Error('no code'), expected: false },
  { description: 'a non-error', error: 'EACCES', expected: false },
];

describe('isErrnoOfDenial', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      then(`yields ${thisCase.expected}`, () => {
        expect(isErrnoOfDenial(thisCase.error)).toEqual(thisCase.expected);
      });
    }),
  );
});
