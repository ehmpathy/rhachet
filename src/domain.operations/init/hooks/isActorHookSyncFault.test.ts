import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { genSampleErrnoError } from '@src/.test/assets/genSampleErrnoError';

import { isActorHookSyncFault } from './isActorHookSyncFault';

const TEST_CASES = [
  {
    description: 'a ConstraintError is an actor fault',
    given: new ConstraintError('settings.json is malformed'),
    expect: true,
  },
  {
    description: 'a MalfunctionError is an actor fault',
    given: new MalfunctionError('adapter write failed'),
    expect: true,
  },
  {
    description: 'an fs errno is an actor fault',
    given: genSampleErrnoError({ code: 'EACCES' }),
    expect: true,
  },
  {
    description: 'a TypeError rethrows',
    given: new TypeError('x is not a function'),
    expect: false,
  },
  {
    description: 'a non-Error throw rethrows',
    given: 'boom',
    expect: false,
  },
];

describe('isActorHookSyncFault', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isActorHookSyncFault(thisCase.given)).toEqual(thisCase.expect);
    }),
  );
});
