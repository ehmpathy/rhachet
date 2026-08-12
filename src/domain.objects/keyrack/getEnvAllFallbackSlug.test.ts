import { given, then, when } from 'test-fns';

import { getEnvAllFallbackSlug } from './getEnvAllFallbackSlug';

/**
 * .note = these cases moved here with the operation, from
 *         `domain.operations/keyrack/decideIsKeySlugEqual.test.ts`. the operation is pure
 *         string logic over a slug's shape, so it belongs beside the other slug operations
 *         in `domain.objects/keyrack/` — and the move is what lets `daemonKeyStore` reach it
 *         without an upward import into `domain.operations`
 */
describe('getEnvAllFallbackSlug', () => {
  given('[case1] valid slug with specific env', () => {
    when('[t0] slug is org.test.KEY', () => {
      then('returns org.all.KEY', () => {
        expect(
          getEnvAllFallbackSlug({ for: { slug: 'org.test.API_KEY' } }),
        ).toBe('org.all.API_KEY');
      });
    });

    when('[t1] slug has dotted key name', () => {
      then('returns correct fallback', () => {
        expect(
          getEnvAllFallbackSlug({ for: { slug: 'org.prod.AWS.PROFILE.NAME' } }),
        ).toBe('org.all.AWS.PROFILE.NAME');
      });
    });
  });

  given('[case2] slug is already env=all', () => {
    when('[t0] slug is org.all.KEY', () => {
      then('returns null (no further fallback)', () => {
        expect(
          getEnvAllFallbackSlug({ for: { slug: 'org.all.API_KEY' } }),
        ).toBeNull();
      });
    });
  });

  given('[case3] malformed slug', () => {
    when('[t0] slug has fewer than 3 parts', () => {
      then('returns null', () => {
        expect(getEnvAllFallbackSlug({ for: { slug: 'simple' } })).toBeNull();
        expect(
          getEnvAllFallbackSlug({ for: { slug: 'two.parts' } }),
        ).toBeNull();
      });
    });
  });
});
