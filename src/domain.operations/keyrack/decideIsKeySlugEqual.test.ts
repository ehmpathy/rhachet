import { given, then, when } from 'test-fns';

import {
  decideIsKeySlugEqual,
  getEnvAllFallbackSlug,
} from './decideIsKeySlugEqual';

describe('decideIsKeySlugEqual', () => {
  given('[case1] exact match', () => {
    when('[t0] slugs are identical', () => {
      then('returns true', () => {
        expect(
          decideIsKeySlugEqual({
            desired: 'org.test.API_KEY',
            proposed: 'org.test.API_KEY',
          }),
        ).toBe(true);
      });
    });
  });

  given('[case2] env=all fallback', () => {
    when('[t0] proposed is env=all version of desired', () => {
      then('returns true', () => {
        expect(
          decideIsKeySlugEqual({
            desired: 'org.test.API_KEY',
            proposed: 'org.all.API_KEY',
          }),
        ).toBe(true);
      });
    });

    when('[t1] desired is env=prod', () => {
      then('env=all fallback works', () => {
        expect(
          decideIsKeySlugEqual({
            desired: 'org.prod.API_KEY',
            proposed: 'org.all.API_KEY',
          }),
        ).toBe(true);
      });
    });

    when('[t2] key name contains dots', () => {
      then('fallback handles dotted key names', () => {
        expect(
          decideIsKeySlugEqual({
            desired: 'org.test.AWS.PROFILE.NAME',
            proposed: 'org.all.AWS.PROFILE.NAME',
          }),
        ).toBe(true);
      });
    });
  });

  given('[case3] no match', () => {
    when('[t0] different key names', () => {
      then('returns false', () => {
        expect(
          decideIsKeySlugEqual({
            desired: 'org.test.API_KEY',
            proposed: 'org.test.OTHER_KEY',
          }),
        ).toBe(false);
      });
    });

    when('[t1] different orgs', () => {
      then('returns false', () => {
        expect(
          decideIsKeySlugEqual({
            desired: 'org1.test.API_KEY',
            proposed: 'org2.test.API_KEY',
          }),
        ).toBe(false);
      });
    });

    when('[t2] env=all cannot match specific env request in reverse', () => {
      then('returns false', () => {
        // if desired is env=all, proposed env=test does NOT satisfy it
        expect(
          decideIsKeySlugEqual({
            desired: 'org.all.API_KEY',
            proposed: 'org.test.API_KEY',
          }),
        ).toBe(false);
      });
    });
  });

  given('[case4] malformed slugs', () => {
    when('[t0] slug has fewer than 3 parts', () => {
      then('still handles gracefully (no fallback)', () => {
        expect(
          decideIsKeySlugEqual({
            desired: 'simple',
            proposed: 'simple',
          }),
        ).toBe(true);

        expect(
          decideIsKeySlugEqual({
            desired: 'simple',
            proposed: 'other',
          }),
        ).toBe(false);
      });
    });
  });
});

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
