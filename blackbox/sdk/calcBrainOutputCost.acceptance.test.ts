import { asIsoPrice } from 'iso-price';
import { given, then, when } from 'test-fns';

// import from dist to verify export works for consumers
import { calcBrainOutputCost } from '../../dist';

describe('calcBrainOutputCost', () => {
  given('[case1] sdk export', () => {
    when('[t0] imported from dist', () => {
      then('function is available and computes cost', () => {
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

    when('[t1] computes cost from words via BPE tokenization', () => {
      then('tokenizes words and calculates cost', () => {
        const exampleRates = {
          per: 'token' as const,
          input: asIsoPrice('$0.000003'),
          output: asIsoPrice('$0.000015'),
          cache: {
            get: asIsoPrice('$0.0000003'),
            set: asIsoPrice('$0.00000375'),
          },
        };

        const result = calcBrainOutputCost({
          for: {
            words: {
              input: 'Hello, world!', // ~4 tokens
              output: 'Hi there!', // ~3 tokens
              cache: { get: '', set: '' },
            },
          },
          with: { cost: { cash: exampleRates } },
        });

        // tokens vary by BPE but should produce non-zero cost
        expect(result.cash.deets.input).not.toEqual('USD 0');
        expect(result.cash.deets.output).not.toEqual('USD 0');
        expect(result.cash.total).not.toEqual('USD 0');
      });
    });
  });
});
