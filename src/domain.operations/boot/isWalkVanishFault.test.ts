import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { genSampleErrnoError as asErrnoError } from '@src/.test/assets/genSampleErrnoError';

import { isWalkVanishFault } from './isWalkVanishFault';

const TEST_CASES = [
  {
    description: 'a ConstraintError is a vanish fault (the tree moved)',
    given: new ConstraintError('the boot tree moved'),
    expect: true,
  },
  {
    description: 'an ENOENT errno is a vanish fault',
    given: asErrnoError({ code: 'ENOENT' }),
    expect: true,
  },
  {
    description: 'an ENOTDIR errno is a vanish fault',
    given: asErrnoError({ code: 'ENOTDIR' }),
    expect: true,
  },
  {
    description: 'an ELOOP errno is a vanish fault',
    given: asErrnoError({ code: 'ELOOP' }),
    expect: true,
  },
  {
    description: 'an EACCES errno rethrows',
    given: asErrnoError({ code: 'EACCES' }),
    expect: false,
  },
  {
    description: 'a MalfunctionError rethrows',
    given: new MalfunctionError('token count did not converge'),
    expect: false,
  },
  {
    description: 'a TypeError rethrows',
    given: new TypeError('x is not a function'),
    expect: false,
  },
  {
    description: 'a non-Error throw rethrows',
    given: 'ENOENT',
    expect: false,
  },
];

describe('isWalkVanishFault', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isWalkVanishFault(thisCase.given)).toEqual(thisCase.expect);
    }),
  );
});
