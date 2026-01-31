import { BrainEpisode } from '../../domain.objects/BrainEpisode';
import type { BrainExchange } from '../../domain.objects/BrainExchange';
import { computeBrainEpisodeHash } from './computeBrainEpisodeHash';

/**
 * .what = factory for BrainEpisode with computed hash
 * .why = ensures hash is always content-derived, supports continuation
 *
 * .note = immutable — always returns NEW episode, never mutates input
 * .note = async for cross-platform portability
 */
export const genBrainEpisode = async (input: {
  on: { episode: Pick<BrainEpisode, 'exchanges'> | null };
  with: { exchange: BrainExchange; exid: string | null };
}): Promise<BrainEpisode> => {
  // build exchanges array: prior + new
  const priorExchanges = input.on.episode?.exchanges ?? [];
  const exchanges = [...priorExchanges, input.with.exchange];

  // compute hash from full exchange list
  const hash = await computeBrainEpisodeHash({ exchanges });

  return new BrainEpisode({
    hash,
    exid: input.with.exid,
    exchanges,
  });
};
