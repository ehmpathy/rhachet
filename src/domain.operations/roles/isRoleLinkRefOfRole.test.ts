import { isRoleLinkRefOfRole } from './isRoleLinkRefOfRole';

const REF = { repo: 'ehmpathy', role: 'mechanic' };

const TEST_CASES = [
  {
    description: 'a bare token names the ref',
    given: { ref: REF, role: 'mechanic' },
    expect: true,
  },
  {
    description: 'a repo-qualified token names the ref',
    given: { ref: REF, role: 'ehmpathy/mechanic' },
    expect: true,
  },
  {
    description: 'another repo does not',
    given: { ref: REF, role: 'bhrain/mechanic' },
    expect: false,
  },
  {
    description: 'another role does not',
    given: { ref: REF, role: 'architect' },
    expect: false,
  },
];

describe('isRoleLinkRefOfRole', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isRoleLinkRefOfRole(thisCase.given)).toEqual(thisCase.expect);
    }),
  );
});
