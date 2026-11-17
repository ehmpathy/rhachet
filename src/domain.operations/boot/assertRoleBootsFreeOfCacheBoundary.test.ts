import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { assertRoleBootsFreeOfCacheBoundary } from './assertRoleBootsFreeOfCacheBoundary';
import { BOOT_CACHE_BOUNDARY_LINE } from './getOneBootCacheBoundary';

const REF_MECHANIC = { repo: 'ehmpathy', role: 'mechanic' };
const REF_ANY = { repo: '.this', role: 'any' };

describe('assertRoleBootsFreeOfCacheBoundary', () => {
  given('[case1] role bodies with no boundary line', () => {
    when('[t0] the guard runs', () => {
      then('it passes', () => {
        expect(() =>
          assertRoleBootsFreeOfCacheBoundary({
            roles: [
              { ref: REF_MECHANIC, body: '# brief\n\nsome text\n' },
              { ref: REF_ANY, body: '# brief\n' },
            ],
          }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] a role body that quotes the boundary amid other text', () => {
    when('[t0] the guard runs', () => {
      then(
        'it refuses: an inline split is unmeasured, so it fails loud',
        async () => {
          const error = await getError(async () =>
            assertRoleBootsFreeOfCacheBoundary({
              roles: [
                {
                  ref: REF_ANY,
                  body: `the render places \`${BOOT_CACHE_BOUNDARY_LINE}\` once\n`,
                },
              ],
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
        },
      );
    });
  });

  given('[case3] a role body with the boundary on its own line', () => {
    when('[t0] the guard runs', () => {
      const run = () =>
        assertRoleBootsFreeOfCacheBoundary({
          roles: [
            { ref: REF_MECHANIC, body: '# ok\n' },
            {
              ref: REF_ANY,
              body: `# brief\n\n  ${BOOT_CACHE_BOUNDARY_LINE}\n\nmore\n`,
            },
          ],
        });

      then('it refuses with a ConstraintError', async () => {
        const error = await getError(async () => run());
        expect(error).toBeInstanceOf(ConstraintError);
      });

      then('the error names only the offender role', async () => {
        const error = await getError(async () => run());
        expect(error.message).toContain('repo=.this/role=any');
        expect(error.message).not.toContain('repo=ehmpathy/role=mechanic');
      });
    });
  });
});
