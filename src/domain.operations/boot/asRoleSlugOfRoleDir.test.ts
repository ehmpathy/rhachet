import { MalfunctionError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { asRoleSlugOfRoleDir } from './asRoleSlugOfRoleDir';

const TEST_CASES = [
  {
    description: 'a .this role dir names its role',
    given: { dir: '/repo/.agent/repo=.this/role=any' },
    expect: { slug: 'any' },
  },
  {
    description: 'a linked role dir names its role, not its repo',
    given: { dir: '/repo/.agent/repo=ehmpathy/role=mechanic' },
    expect: { slug: 'mechanic' },
  },
  {
    description: 'a slug that holds a dot or a dash survives whole',
    given: { dir: '/repo/.agent/repo=.this/role=any.lint-strict' },
    expect: { slug: 'any.lint-strict' },
  },
];

describe('asRoleSlugOfRoleDir', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the transformer runs', () => {
        then('it returns the expected slug', () => {
          expect(asRoleSlugOfRoleDir(thisCase.given)).toEqual(
            thisCase.expect.slug,
          );
        });
      });
    }),
  );

  const CASES_REFUSED = [
    {
      description: 'a dir with no role= segment',
      dir: '/repo/.agent/repo=.this',
    },
    {
      description: 'a role= segment with no slug',
      dir: '/repo/.agent/repo=.this/role=',
    },
  ];
  CASES_REFUSED.map((thisCase, index) =>
    given(
      `[case${TEST_CASES.length + index + 1}] ${thisCase.description}`,
      () => {
        when('[t0] the transformer runs', () => {
          then(`fails loud on ${thisCase.description}`, () => {
            const error = getError(() =>
              asRoleSlugOfRoleDir({ dir: thisCase.dir }),
            );
            expect(error).toBeInstanceOf(MalfunctionError);
            expect(error.message).toContain('role=<slug>');
          });
        });
      },
    ),
  );
});
