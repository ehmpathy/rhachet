import { asIsoPrice } from 'iso-price';

import { BrainOutput } from '@src/domain.objects/BrainOutput';
import { BrainOutputMetrics } from '@src/domain.objects/BrainOutputMetrics';
import { genBrainEpisode } from '@src/domain.operations/brainContinuation/genBrainEpisode';
import { genBrainExchange } from '@src/domain.operations/brainContinuation/genBrainExchange';

/**
 * .what = placeholder metrics for external brains that don't return BrainOutput yet
 * .why = backwards compat while brain suppliers adopt BrainOutput interface
 * .todo = remove after all brain suppliers return BrainOutput
 */
const metricsPlaceholder = new BrainOutputMetrics({
  size: {
    tokens: { input: 0, output: 0, cache: { get: 0, set: 0 } },
    chars: { input: 0, output: 0, cache: { get: 0, set: 0 } },
  },
  cost: {
    time: { milliseconds: 0 },
    cash: {
      total: asIsoPrice('$0'),
      deets: {
        input: asIsoPrice('$0'),
        output: asIsoPrice('$0'),
        cache: { get: asIsoPrice('$0'), set: asIsoPrice('$0') },
      },
    },
  },
});

/**
 * .what = normalizes brain output for backwards compat with external brains
 * .why = external brains may return TOutput directly instead of BrainOutput<TOutput>
 * .todo = remove after all brain suppliers return BrainOutput
 */
export const asBrainOutput = async <TOutput>(
  result: TOutput | BrainOutput<TOutput>,
): Promise<BrainOutput<TOutput>> => {
  // check if result is already a BrainOutput (has .output and .metrics properties)
  const isBrainOutput =
    result !== null &&
    typeof result === 'object' &&
    'output' in result &&
    'metrics' in result;

  if (isBrainOutput) return result as BrainOutput<TOutput>;

  // wrap raw output in BrainOutput with placeholder metrics and episode
  const exchange = await genBrainExchange({
    with: {
      input: '__placeholder_input__',
      output: JSON.stringify(result),
      exid: null,
    },
  });
  const episode = await genBrainEpisode({
    on: { episode: null },
    with: { exchange, exid: null },
  });
  return new BrainOutput<TOutput>({
    output: result as TOutput,
    metrics: metricsPlaceholder,
    episode,
    series: null,
  });
};
