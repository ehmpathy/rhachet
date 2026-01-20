import { type IsoPrice, multiplyPrice, sumPrices } from 'iso-price';
import type { PickOne } from 'type-fns';

import type { BrainOutputMetrics } from '../../domain.objects/BrainOutputMetrics';
import type { BrainSpec } from '../../domain.objects/BrainSpec';

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
     * .what = character counts to estimate tokens from
     * .note = uses ~4 chars per token heuristic
     */
    chars: BrainOutputMetrics['size']['chars'];
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
  // resolve tokens (use directly or estimate from chars)
  const tokens = input.for.tokens ?? {
    input: Math.ceil(input.for.chars!.input / 4),
    output: Math.ceil(input.for.chars!.output / 4),
    cache: {
      get: Math.ceil(input.for.chars!.cache.get / 4),
      set: Math.ceil(input.for.chars!.cache.set / 4),
    },
  };

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
