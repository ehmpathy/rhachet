import type { BrainEpisode } from '@src/domain.objects/BrainEpisode';
import { BrainSeries } from '@src/domain.objects/BrainSeries';

import { computeBrainSeriesHash } from './computeBrainSeriesHash';

/**
 * .what = factory for BrainSeries with computed hash
 * .why = ensures hash is always content-derived, supports continuation
 *
 * .note = immutable — always returns NEW series, never mutates input
 * .note = async for cross-platform portability
 */
export const genBrainSeries = async (input: {
  on: { series: Pick<BrainSeries, 'episodes'> | null };
  with: { episode: BrainEpisode; exid: string | null };
}): Promise<BrainSeries> => {
  // build episodes array: prior + new
  const priorEpisodes = input.on.series?.episodes ?? [];
  const episodes = [...priorEpisodes, input.with.episode];

  // compute hash from full episode list
  const hash = await computeBrainSeriesHash({ episodes });

  return new BrainSeries({
    hash,
    exid: input.with.exid,
    episodes,
  });
};
