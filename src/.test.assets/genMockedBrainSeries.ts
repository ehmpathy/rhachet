import { BrainEpisode } from '@src/domain.objects/BrainEpisode';
import { BrainSeries } from '@src/domain.objects/BrainSeries';
import { genBrainSeries } from '@src/domain.operations/brainContinuation/genBrainSeries';

import { genMockedBrainEpisode } from './genMockedBrainEpisode';

/**
 * .what = generates a mocked BrainSeries for tests
 * .why = provides a simple way to create test fixtures with sensible defaults
 */
export const genMockedBrainSeries = async (input?: {
  episode?: BrainEpisode;
  priorSeries?: BrainSeries | null;
  exid?: string | null;
}): Promise<BrainSeries> => {
  const episode = input?.episode ?? (await genMockedBrainEpisode());
  return genBrainSeries({
    on: { series: input?.priorSeries ?? null },
    with: {
      episode,
      exid: input?.exid ?? null,
    },
  });
};
