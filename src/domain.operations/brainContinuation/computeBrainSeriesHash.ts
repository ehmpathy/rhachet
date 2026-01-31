import { asHashSha256 } from 'hash-fns';

import type { BrainEpisode } from '../../domain.objects/BrainEpisode';

/**
 * .what = computes content-derived hash for a BrainSeries
 * .why = enables deterministic identity based on episode content
 *
 * .note = order-sensitive — same episodes in different order produce different hash
 * .note = async for cross-platform portability
 */
export const computeBrainSeriesHash = async (input: {
  episodes: Pick<BrainEpisode, 'hash'>[];
}): Promise<string> => {
  const content = input.episodes.map((e) => e.hash).join('\n');
  return asHashSha256(content);
};
