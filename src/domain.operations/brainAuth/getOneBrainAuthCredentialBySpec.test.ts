import { BadRequestError, getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import type { BrainAuthCredential } from '@src/domain.objects/BrainAuthCredential';

import {
  type ContextBrainAuth,
  getOneBrainAuthCredentialBySpec,
} from './getOneBrainAuthCredentialBySpec';

/**
 * .what = mock context for brain auth tests
 */
const genMockContext = (overrides?: {
  keys?: string[];
  credentials?: Record<string, BrainAuthCredential>;
  rotationIndex?: number;
}): ContextBrainAuth => {
  const keys = overrides?.keys ?? [
    'ANTHROPIC_API_KEY_1',
    'ANTHROPIC_API_KEY_2',
  ];
  const credentials = overrides?.credentials ?? {
    'ehmpathy.prod.ANTHROPIC_API_KEY_1': {
      slug: 'ehmpathy.prod.ANTHROPIC_API_KEY_1',
      token: 'sk-ant-token-1',
    },
    'ehmpathy.prod.ANTHROPIC_API_KEY_2': {
      slug: 'ehmpathy.prod.ANTHROPIC_API_KEY_2',
      token: 'sk-ant-token-2',
    },
  };

  let currentIndex = overrides?.rotationIndex ?? -1;

  return {
    adapter: {
      slug: 'anthropic/claude-code',
      capacity: {
        get: {
          async one(query) {
            return {
              credential: { slug: query.credential.slug },
              tokens: { unit: 'percentage', used: 0, limit: 100, left: 100 },
              refreshAt: null,
            };
          },
          async all(query) {
            return query.credentials.map((c) => ({
              credential: { slug: c.slug },
              tokens: { unit: 'percentage', used: 0, limit: 100, left: 100 },
              refreshAt: null,
            }));
          },
        },
      },
      auth: {
        async supply(query) {
          return {
            credential: query.credential,
            brainSlug: 'anthropic/claude-code',
            formatted: query.credential.token,
          };
        },
      },
    },
    keyrack: {
      async listKeys() {
        return keys;
      },
      async getCredential(query) {
        return credentials[query.slug] ?? null;
      },
    },
    rotationState: {
      async getLastIndex() {
        return currentIndex;
      },
      async setLastIndex(query) {
        currentIndex = query.index;
      },
    },
  };
};

describe('getOneBrainAuthCredentialBySpec', () => {
  given('[case1] solo spec with exact key', () => {
    const context = genMockContext();

    when('[t0] spec has solo strategy', () => {
      then('returns single credential', async () => {
        const result = await getOneBrainAuthCredentialBySpec(
          { spec: 'solo(keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_1)' },
          context,
        );
        expect(result.formatted).toEqual('sk-ant-token-1');
        expect(result.brainSlug).toEqual('anthropic/claude-code');
      });
    });
  });

  given('[case2] default spec with source', () => {
    const context = genMockContext();

    when('[t0] spec has keyrack URI', () => {
      then('returns credential', async () => {
        const result = await getOneBrainAuthCredentialBySpec(
          { spec: 'keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_2' },
          context,
        );
        expect(result.formatted).toEqual('sk-ant-token-2');
      });
    });
  });

  given('[case3] pool spec with wildcard', () => {
    const context = genMockContext();

    when('[t0] first call to pool', () => {
      then('returns first credential (index 0)', async () => {
        const result = await getOneBrainAuthCredentialBySpec(
          { spec: 'pool(keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_*)' },
          context,
        );
        expect(result.formatted).toEqual('sk-ant-token-1');
      });
    });

    when('[t1] second call to pool', () => {
      then('returns second credential (index 1)', async () => {
        // create fresh context for isolation
        const freshContext = genMockContext();

        // first call sets index to 0
        await getOneBrainAuthCredentialBySpec(
          { spec: 'pool(keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_*)' },
          freshContext,
        );

        // second call rotates to index 1
        const result = await getOneBrainAuthCredentialBySpec(
          { spec: 'pool(keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_*)' },
          freshContext,
        );
        expect(result.formatted).toEqual('sk-ant-token-2');
      });
    });

    when('[t2] third call wraps around', () => {
      then('returns first credential again (index 0)', async () => {
        // simulate index at 1
        const contextWithIndex = genMockContext({ rotationIndex: 1 });

        const result = await getOneBrainAuthCredentialBySpec(
          { spec: 'pool(keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_*)' },
          contextWithIndex,
        );
        expect(result.formatted).toEqual('sk-ant-token-1');
      });
    });
  });

  given('[case4] default spec with no source', () => {
    const context = genMockContext();

    when('[t0] spec is empty', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(async () =>
          getOneBrainAuthCredentialBySpec({ spec: '' }, context),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error!.message).toContain('no source');
      });
    });
  });

  given('[case5] credential not found', () => {
    const context = genMockContext({
      keys: ['MISSING_KEY'],
      credentials: {},
    });

    when('[t0] keyrack has no credential', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(async () =>
          getOneBrainAuthCredentialBySpec(
            { spec: 'keyrack://ehmpathy/prod/MISSING_KEY' },
            context,
          ),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error!.message).toContain('not found');
      });
    });
  });
});
