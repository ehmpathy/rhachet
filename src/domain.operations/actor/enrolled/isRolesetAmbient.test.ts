import { given, then } from 'test-fns';

import { isRolesetAmbient } from './isRolesetAmbient';

const TEST_CASES = [
  {
    description: 'the same set, in another order, is ambient',
    given: {
      roles: ['driver', 'mechanic'],
      rolesAmbient: ['mechanic', 'driver'],
    },
    expect: true,
  },
  {
    description: 'a subset is not ambient',
    given: { roles: ['mechanic'], rolesAmbient: ['mechanic', 'driver'] },
    expect: false,
  },
  {
    description: 'a superset is not ambient',
    given: {
      roles: ['mechanic', 'driver', 'architect'],
      rolesAmbient: ['mechanic', 'driver'],
    },
    expect: false,
  },
  {
    description: 'two empty sets are ambient',
    given: { roles: [], rolesAmbient: [] },
    expect: true,
  },
  {
    description: 'a duplicate role does not make a subset ambient',
    given: {
      roles: ['mechanic', 'mechanic'],
      rolesAmbient: ['mechanic', 'driver'],
    },
    expect: false,
  },
];

describe('isRolesetAmbient', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      then(`it reads ${thisCase.expect}`, () => {
        expect(isRolesetAmbient(thisCase.given)).toEqual(thisCase.expect);
      });
    }),
  );
});
