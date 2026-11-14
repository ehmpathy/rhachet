import { isRoleRefSame } from './isRoleRefSame';

const TEST_CASES = [
  {
    description: 'the same repo and role name one role',
    given: {
      a: { repo: 'ehmpathy', role: 'mechanic' },
      b: { repo: 'ehmpathy', role: 'mechanic' },
    },
    expect: true,
  },
  {
    description: 'the same slug in two repos names two roles (F11)',
    given: {
      a: { repo: 'ehmpathy', role: 'mechanic' },
      b: { repo: 'acme', role: 'mechanic' },
    },
    expect: false,
  },
  {
    description: 'two slugs in one repo name two roles',
    given: {
      a: { repo: 'ehmpathy', role: 'mechanic' },
      b: { repo: 'ehmpathy', role: 'architect' },
    },
    expect: false,
  },
];

describe('isRoleRefSame', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isRoleRefSame(thisCase.given)).toEqual(thisCase.expect);
    }),
  );
});
