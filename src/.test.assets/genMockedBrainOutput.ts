import type { BrainGrain } from '@src/domain.objects/BrainGrain';
import {
  AsBrainOutputSeriesFor,
  BrainOutput,
} from '@src/domain.objects/BrainOutput';
import { BrainOutputMetrics } from '@src/domain.objects/BrainOutputMetrics';
import { genBrainEpisode } from '@src/domain.operations/brainContinuation/genBrainEpisode';
import { genBrainExchange } from '@src/domain.operations/brainContinuation/genBrainExchange';
import { genBrainSeries } from '@src/domain.operations/brainContinuation/genBrainSeries';

import { genMockedBrainOutputMetrics } from './genMockedBrainOutputMetrics';

/**
 * .what = generates a mocked BrainOutput for tests
 * .why = reduces boilerplate and ensures consistent mock behavior with episode/series
 */
export const genMockedBrainOutput = async <
  TOutput,
  TBrainGrain extends BrainGrain = BrainGrain,
>(input: {
  output: TOutput;
  metrics?: BrainOutputMetrics;
  brainChoice?: TBrainGrain;
}): Promise<BrainOutput<TOutput, TBrainGrain>> => {
  const exchange = await genBrainExchange({
    with: {
      input: '__mock_input__',
      output: JSON.stringify(input.output),
      exid: null,
    },
  });
  const episode = await genBrainEpisode({
    on: { episode: null },
    with: { exchange, exid: null },
  });

  const brainChoice = input.brainChoice ?? ('atom' as TBrainGrain);
  const series =
    brainChoice === 'repl'
      ? await genBrainSeries({
          on: { series: null },
          with: { episode, exid: null },
        })
      : null;

  return new BrainOutput({
    output: input.output,
    metrics: input.metrics ?? genMockedBrainOutputMetrics(),
    episode,
    series: series as AsBrainOutputSeriesFor<TBrainGrain>,
  });
};
