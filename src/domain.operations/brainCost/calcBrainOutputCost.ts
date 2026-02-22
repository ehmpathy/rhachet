import { UnexpectedCodePathError } from 'helpful-errors';
import { type IsoPrice, multiplyPrice, sumPrices } from 'iso-price';
import type { PickOne } from 'type-fns';

import type { BrainOutputMetrics } from '@src/domain.objects/BrainOutputMetrics';
import type { BrainSpec } from '@src/domain.objects/BrainSpec';

import { calcBrainTokens } from './calcBrainTokens';

/**
 * .what = calculates the cash cost of a brain invocation
 * .why = enables cost estimation before invocation and cost calculation after
 *
 * .note = rates in `with.cost.cash` are already per-token
 *   (e.g., `priceDivide({ of: '$3', by: 1_000_000 })` done at spec declaration)
 */
export const calcBrainOutputCost = (input: {
  for: PickOne<{
    /**
     * .what = token counts from api response (direct)
     */
    tokens: BrainOutputMetrics['size']['tokens'];

    /**
     * .what = word strings to tokenize via BPE
     * .note = uses gpt-tokenizer with o200k_base encoder for accurate counts
     */
    words: {
      input: string;
      output: string;
      cache: { get: string; set: string };
    };
  }>;
  with: {
    cost: {
      cash: BrainSpec['cost']['cash'];
    };
  };
}): {
  cash: {
    total: IsoPrice;
    deets: {
      input: IsoPrice;
      output: IsoPrice;
      cache: { get: IsoPrice; set: IsoPrice };
    };
  };
} => {
  // cast words -> tokens and recurse
  if (input.for.words)
    return calcBrainOutputCost({
      for: {
        tokens: {
          input: calcBrainTokens({ of: { words: input.for.words.input } })
            .tokens,
          output: calcBrainTokens({ of: { words: input.for.words.output } })
            .tokens,
          cache: {
            get: calcBrainTokens({ of: { words: input.for.words.cache.get } })
              .tokens,
            set: calcBrainTokens({ of: { words: input.for.words.cache.set } })
              .tokens,
          },
        },
      },
      with: input.with,
    });

  // resolve tokens with default error
  const tokens = (() => {
    if (input.for.tokens) return input.for.tokens;
    throw new UnexpectedCodePathError(
      'calcBrainOutputCost requires either tokens or words',
      { input },
    );
  })();

  // calculate cost deets (rates are already per-token)
  const deets = {
    input: multiplyPrice({
      of: input.with.cost.cash.input,
      by: tokens.input,
    }),
    output: multiplyPrice({
      of: input.with.cost.cash.output,
      by: tokens.output,
    }),
    cache: {
      get: multiplyPrice({
        of: input.with.cost.cash.cache.get,
        by: tokens.cache.get,
      }),
      set: multiplyPrice({
        of: input.with.cost.cash.cache.set,
        by: tokens.cache.set,
      }),
    },
  };

  // calculate total
  const total = sumPrices(
    deets.input,
    deets.output,
    deets.cache.get,
    deets.cache.set,
  );

  return { cash: { total, deets } };
};
