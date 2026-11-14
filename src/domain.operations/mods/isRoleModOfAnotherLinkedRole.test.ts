import { isRoleModOfAnotherLinkedRole } from './isRoleModOfAnotherLinkedRole';

const REF = { repo: 'acme', role: 'mechanic' };
const REFS_LINKED = [
  { repo: 'acme', role: 'mechanic' },
  { repo: 'ehmpathy', role: 'mechanic' },
  { repo: 'bhrain', role: 'driver' },
];

const TEST_CASES = [
  {
    description: 'a mod that pins no repo is over this ref',
    given: { ofRepo: null },
    expect: false,
  },
  {
    description: "a mod pinned to this ref's own repo is over this ref",
    given: { ofRepo: 'acme' },
    expect: false,
  },
  {
    description:
      'a mod pinned to another linked repo of this slug is over another role',
    given: { ofRepo: 'ehmpathy' },
    expect: true,
  },
  {
    description:
      'a mod pinned to a linked repo that ships no role of this slug is a typo',
    given: { ofRepo: 'bhrain' },
    expect: false,
  },
  {
    description: 'a mod pinned to a repo no link holds is a typo',
    given: { ofRepo: 'ehmpaty' },
    expect: false,
  },
];

describe('isRoleModOfAnotherLinkedRole', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(
        isRoleModOfAnotherLinkedRole({
          ofRepo: thisCase.given.ofRepo,
          ref: REF,
          refsLinked: REFS_LINKED,
        }),
      ).toEqual(thisCase.expect);
    }),
  );
});
