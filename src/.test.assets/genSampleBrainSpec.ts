import { asIsoPrice } from 'iso-price';

import { BrainSpec } from '@src/domain.objects/BrainSpec';

/**
 * .what = generates a sample BrainSpec for tests
 * .why = provides realistic test fixtures based on anthropic claude opus rates
 */
export const genSampleBrainSpec = (): BrainSpec =>
  new BrainSpec({
    cost: {
      time: {
        speed: { tokens: 100, per: { seconds: 1 } },
        latency: { milliseconds: 500 },
      },
      cash: {
        per: 'token',
        input: asIsoPrice('$0.000003'), // $3/mil tokens
        output: asIsoPrice('$0.000015'), // $15/mil tokens
        cache: {
          get: asIsoPrice('$0.0000003'), // $0.30/mil tokens
          set: asIsoPrice('$0.00000375'), // $3.75/mil tokens
        },
      },
    },
    gain: {
      size: {
        context: { tokens: 200_000 },
      },
      grades: {
        swe: 72.5,
      },
      cutoff: '2025-04-01',
      domain: 'ALL',
      skills: {
        tooluse: true,
        vision: true,
      },
    },
  });
