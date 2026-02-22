import { asHashSha256 } from 'hash-fns';

import type { BrainExchange } from '@src/domain.objects/BrainExchange';

/**
 * .what = computes content-derived hash for a BrainEpisode
 * .why = enables deterministic identity based on exchange content
 *
 * .note = order-sensitive — same exchanges in different order produce different hash
 * .note = async for cross-platform portability
 */
export const computeBrainEpisodeHash = async (input: {
  exchanges: Pick<BrainExchange, 'hash'>[];
}): Promise<string> => {
  const content = input.exchanges.map((e) => e.hash).join('\n');
  return asHashSha256(content);
};
