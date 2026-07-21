import { BadRequestError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { getRemovalTargets } from './getRemovalTargets';

describe('getRemovalTargets', () => {
  given('[case1] an unqualified slug linked under a single repo', () => {
    when('[t0] the slug is removed', () => {
      then('returns the one { repo, role } target', () => {
        const targets = getRemovalTargets({
          removes: ['reviewer'],
          linkedRoles: [{ repo: 'ehmpathy', role: 'reviewer' }],
          nativeRoles: [],
        });
        expect(targets).toEqual([{ repo: 'ehmpathy', role: 'reviewer' }]);
      });
    });
  });

  given('[case2] an unqualified slug linked under two repos (e8)', () => {
    when('[t0] the slug is removed without qualification', () => {
      then(
        'throws BadRequestError about ambiguity with a qualify hint',
        async () => {
          const error = await getError(() =>
            getRemovalTargets({
              removes: ['reviewer'],
              linkedRoles: [
                { repo: 'ehmpathy', role: 'reviewer' },
                { repo: 'bhuild', role: 'reviewer' },
              ],
              nativeRoles: [],
            }),
          );
          expect(error).toBeInstanceOf(BadRequestError);
          expect(error.message).toContain('ambiguous');
        },
      );
    });

    when('[t1] the same slug is removed with a repo qualifier', () => {
      then('returns only the qualified target', () => {
        const targets = getRemovalTargets({
          removes: ['bhuild/reviewer'],
          linkedRoles: [
            { repo: 'ehmpathy', role: 'reviewer' },
            { repo: 'bhuild', role: 'reviewer' },
          ],
          nativeRoles: [],
        });
        expect(targets).toEqual([{ repo: 'bhuild', role: 'reviewer' }]);
      });
    });
  });

  given('[case3] a slug that is not linked (e2 idempotent)', () => {
    when('[t0] the absent slug is removed', () => {
      then('returns no targets (silent no-op)', () => {
        const targets = getRemovalTargets({
          removes: ['nonesuch'],
          linkedRoles: [{ repo: 'ehmpathy', role: 'reviewer' }],
          nativeRoles: [],
        });
        expect(targets).toEqual([]);
      });
    });
  });

  given('[case4] a native role name (e11)', () => {
    when('[t0] an unqualified native slug is removed', () => {
      then('throws — native roles cannot be removed', async () => {
        const error = await getError(() =>
          getRemovalTargets({
            removes: ['somenative'],
            linkedRoles: [],
            nativeRoles: ['somenative'],
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('native roles');
      });
    });

    when('[t1] an explicitly .this-qualified slug is removed', () => {
      then('throws — native roles cannot be removed', async () => {
        const error = await getError(() =>
          getRemovalTargets({
            removes: ['.this/somenative'],
            linkedRoles: [],
            nativeRoles: ['somenative'],
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('native roles');
      });
    });
  });

  given('[case5] multiple removes at once', () => {
    when('[t0] two distinct linked slugs are removed', () => {
      then('returns both targets in order', () => {
        const targets = getRemovalTargets({
          removes: ['reviewer', 'ehmpathy/mechanic'],
          linkedRoles: [
            { repo: 'ehmpathy', role: 'reviewer' },
            { repo: 'ehmpathy', role: 'mechanic' },
          ],
          nativeRoles: [],
        });
        expect(targets).toEqual([
          { repo: 'ehmpathy', role: 'reviewer' },
          { repo: 'ehmpathy', role: 'mechanic' },
        ]);
      });
    });
  });
});
