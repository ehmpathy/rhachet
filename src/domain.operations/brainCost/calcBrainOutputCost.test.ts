import { asIsoPrice } from 'iso-price';
import { given, then, when } from 'test-fns';

import { calcBrainOutputCost } from './calcBrainOutputCost';

describe('calcBrainOutputCost', () => {
  // example rates: anthropic claude opus rates (per token, already divided)
  const exampleRates = {
    per: 'token' as const,
    input: asIsoPrice('$0.000003'), // $3/mil
    output: asIsoPrice('$0.000015'), // $15/mil
    cache: {
      get: asIsoPrice('$0.0000003'), // $0.30/mil
      set: asIsoPrice('$0.00000375'), // $3.75/mil
    },
  };

  given('[case1] token counts provided directly', () => {
    when('[t0] 1000 input + 500 output tokens', () => {
      then('total reflects sum of input and output costs', () => {
        const result = calcBrainOutputCost({
          for: {
            tokens: {
              input: 1000,
              output: 500,
              cache: { get: 0, set: 0 },
            },
          },
          with: { cost: { cash: exampleRates } },
        });

        // input: 1000 * $0.000003 = $0.003
        // output: 500 * $0.000015 = $0.0075
        // total: $0.0105
        expect(result.cash.deets.input).toEqual('USD 0.003_000');
        expect(result.cash.deets.output).toEqual('USD 0.007_500');
        expect(result.cash.total).toEqual('USD 0.010_500_000');
      });
    });

    when('[t1] with cache tokens', () => {
      then('cache costs included in total', () => {
        const result = calcBrainOutputCost({
          for: {
            tokens: {
              input: 1000,
              output: 500,
              cache: { get: 2000, set: 500 },
            },
          },
          with: { cost: { cash: exampleRates } },
        });

        // input: 1000 * $0.000003 = $0.003
        // output: 500 * $0.000015 = $0.0075
        // cache.get: 2000 * $0.0000003 = $0.0006
        // cache.set: 500 * $0.00000375 = $0.001875
        // total: $0.012975
        expect(result.cash.deets.cache.get).toEqual('USD 0.000_600_000');
        expect(result.cash.deets.cache.set).toEqual('USD 0.001_875_000');
        expect(result.cash.total).toEqual('USD 0.012_975_000');
      });
    });
  });

  given('[case2] words provided', () => {
    when('[t0] words tokenized via BPE', () => {
      then('calculates cost from estimated tokens', () => {
        const result = calcBrainOutputCost({
          for: {
            words: {
              input: 'Hello, world! This is a test.',
              output: 'Hi there!',
              cache: { get: '', set: '' },
            },
          },
          with: { cost: { cash: exampleRates } },
        });

        // BPE tokenization produces non-zero token counts
        // exact values depend on tokenizer, but costs should be positive
        expect(result.cash.deets.input).not.toEqual('USD 0.000_000');
        expect(result.cash.deets.output).not.toEqual('USD 0.000_000');
        expect(result.cash.total).not.toEqual('USD 0.000_000_000');
      });
    });
  });

  given('[case3] zero tokens', () => {
    when('[t0] all zeros', () => {
      then('total is zero', () => {
        const result = calcBrainOutputCost({
          for: {
            tokens: {
              input: 0,
              output: 0,
              cache: { get: 0, set: 0 },
            },
          },
          with: { cost: { cash: exampleRates } },
        });

        expect(result.cash.total).toEqual('USD 0.000_000_000');
        expect(result.cash.deets.input).toEqual('USD 0.000_000');
        expect(result.cash.deets.output).toEqual('USD 0.000_000');
        expect(result.cash.deets.cache.get).toEqual('USD 0.000_000_000');
        expect(result.cash.deets.cache.set).toEqual('USD 0.000_000_000');
      });
    });
  });
});
