import { isHookAuthorOfEnrolledRoles } from './isHookAuthorOfEnrolledRoles';

const TEST_CASES = [
  {
    description: 'a bare slug carries that slug in any repo',
    given: { author: 'repo=acme/role=mechanic', roles: ['mechanic'] },
    expect: true,
  },
  {
    description: 'a pinned repo/role carries its own repo role',
    given: {
      author: 'repo=ehmpathy/role=mechanic',
      roles: ['ehmpathy/mechanic'],
    },
    expect: true,
  },
  {
    description:
      'a pinned repo/role never carries the same slug of another repo',
    given: { author: 'repo=acme/role=mechanic', roles: ['ehmpathy/mechanic'] },
    expect: false,
  },
  {
    description: 'a pinned repo/role with a focus keeps its role hooks',
    given: {
      author: 'repo=ehmpathy/role=mechanic',
      roles: ['ehmpathy/mechanic::flow'],
    },
    expect: true,
  },
  {
    description: 'a pinned .this role carries the .this hooks',
    given: { author: 'repo=.this/role=any', roles: ['.this/any'] },
    expect: true,
  },
  {
    description:
      'a pinned repo/role never carries a stale repo=.mods hook of its slug (a mod arms none)',
    given: { author: 'repo=.mods/role=mechanic', roles: ['ehmpathy/mechanic'] },
    expect: false,
  },
  {
    description: 'a slug never matches a longer slug it is a prefix of',
    given: { author: 'repo=ehmpathy/role=architect-ops', roles: ['architect'] },
    expect: false,
  },
  {
    description: 'an author with no role segment names no role',
    given: { author: 'human', roles: ['mechanic'] },
    expect: null,
  },
];

describe('isHookAuthorOfEnrolledRoles', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isHookAuthorOfEnrolledRoles(thisCase.given)).toEqual(
        thisCase.expect,
      );
    }),
  );
});
