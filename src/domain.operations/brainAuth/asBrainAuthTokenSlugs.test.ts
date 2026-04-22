import { BadRequestError, getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asBrainAuthTokenSlugs } from './asBrainAuthTokenSlugs';

describe('asBrainAuthTokenSlugs', () => {
  given('[case1] exact key pattern (no wildcard)', () => {
    when('[t0] source has exact key name', () => {
      then('returns single slug', () => {
        const result = asBrainAuthTokenSlugs({
          source: 'keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_1',
          availableKeys: [
            'ANTHROPIC_API_KEY_1',
            'ANTHROPIC_API_KEY_2',
            'OTHER_KEY',
          ],
        });
        expect(result.slugs).toEqual(['ehmpathy.prod.ANTHROPIC_API_KEY_1']);
        expect(result.org).toEqual('ehmpathy');
        expect(result.env).toEqual('prod');
      });
    });
  });

  given('[case2] wildcard pattern', () => {
    when('[t0] pattern has trailing wildcard', () => {
      then('returns all slugs that match', () => {
        const result = asBrainAuthTokenSlugs({
          source: 'keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_*',
          availableKeys: [
            'ANTHROPIC_API_KEY_1',
            'ANTHROPIC_API_KEY_2',
            'ANTHROPIC_API_KEY_10',
            'OTHER_KEY',
            'ANTHROPIC_TOKEN',
          ],
        });
        expect(result.slugs).toEqual([
          'ehmpathy.prod.ANTHROPIC_API_KEY_1',
          'ehmpathy.prod.ANTHROPIC_API_KEY_2',
          'ehmpathy.prod.ANTHROPIC_API_KEY_10',
        ]);
      });
    });

    when('[t1] pattern has middle wildcard', () => {
      then('returns all slugs that match', () => {
        const result = asBrainAuthTokenSlugs({
          source: 'keyrack://ehmpathy/prod/API_*_TOKEN',
          availableKeys: [
            'API_STRIPE_TOKEN',
            'API_GITHUB_TOKEN',
            'OTHER_KEY',
            'API_TOKEN',
          ],
        });
        expect(result.slugs).toEqual([
          'ehmpathy.prod.API_STRIPE_TOKEN',
          'ehmpathy.prod.API_GITHUB_TOKEN',
        ]);
      });
    });
  });

  given('[case3] no match', () => {
    when('[t0] pattern has no results in available keys', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(async () =>
          asBrainAuthTokenSlugs({
            source: 'keyrack://ehmpathy/prod/NONEXISTENT_*',
            availableKeys: ['ANTHROPIC_API_KEY_1', 'OTHER_KEY'],
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error!.message).toContain('no keys match pattern');
      });
    });
  });

  given('[case4] invalid URI format', () => {
    when('[t0] source has wrong prefix', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(async () =>
          asBrainAuthTokenSlugs({
            source: 'https://example.com/key',
            availableKeys: ['SOME_KEY'],
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error!.message).toContain('invalid keyrack URI format');
      });
    });

    when('[t1] source has absent path segments', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(async () =>
          asBrainAuthTokenSlugs({
            source: 'keyrack://ehmpathy/KEY',
            availableKeys: ['SOME_KEY'],
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error!.message).toContain('invalid keyrack URI format');
      });
    });
  });

  given('[case5] different org and env', () => {
    when('[t0] source has different org', () => {
      then('returns slugs with correct org.env prefix', () => {
        const result = asBrainAuthTokenSlugs({
          source: 'keyrack://acme/test/STRIPE_KEY',
          availableKeys: ['STRIPE_KEY', 'OTHER_KEY'],
        });
        expect(result.slugs).toEqual(['acme.test.STRIPE_KEY']);
        expect(result.org).toEqual('acme');
        expect(result.env).toEqual('test');
      });
    });
  });
});
