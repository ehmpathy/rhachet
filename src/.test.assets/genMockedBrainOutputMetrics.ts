import { asIsoPrice } from 'iso-price';

import { BrainOutputMetrics } from '@src/domain.objects/BrainOutputMetrics';

/**
 * .what = generates mocked BrainOutputMetrics for tests
 * .why = provides consistent mock metrics data for test fixtures
 */
export const genMockedBrainOutputMetrics = (input?: {
  inputTokens?: number;
  outputTokens?: number;
  cacheGetTokens?: number;
  cacheSetTokens?: number;
}): BrainOutputMetrics =>
  new BrainOutputMetrics({
    size: {
      tokens: {
        input: input?.inputTokens ?? 1000,
        output: input?.outputTokens ?? 500,
        cache: {
          get: input?.cacheGetTokens ?? 0,
          set: input?.cacheSetTokens ?? 0,
        },
      },
      chars: {
        input: (input?.inputTokens ?? 1000) * 4,
        output: (input?.outputTokens ?? 500) * 4,
        cache: {
          get: (input?.cacheGetTokens ?? 0) * 4,
          set: (input?.cacheSetTokens ?? 0) * 4,
        },
      },
    },
    cost: {
      time: { milliseconds: 1500 },
      cash: {
        total: asIsoPrice('$0.01'),
        deets: {
          input: asIsoPrice('$0.003'),
          output: asIsoPrice('$0.0075'),
          cache: {
            get: asIsoPrice('$0'),
            set: asIsoPrice('$0'),
          },
        },
      },
    },
  });
