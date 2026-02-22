import type { BrainEpisode } from '@src/domain.objects/BrainEpisode';
import type { BrainExchange } from '@src/domain.objects/BrainExchange';
import type { BrainGrain } from '@src/domain.objects/BrainGrain';
import type { BrainSeries } from '@src/domain.objects/BrainSeries';

import { genBrainEpisode } from './genBrainEpisode';
import { genBrainExchange } from './genBrainExchange';
import { genBrainSeries } from './genBrainSeries';

/**
 * .what = input shape for genBrainContinuables
 * .why = shared across overloads
 */
interface GenBrainContinuablesInput<TGrain extends BrainGrain> {
  for: { grain: TGrain };
  on: {
    episode?: Pick<BrainEpisode, 'exchanges'> | null;
    series?: Pick<BrainSeries, 'episodes'> | null;
  };
  with: {
    exchange: Pick<BrainExchange, 'input' | 'output' | 'exid'>;
    episode?: Pick<BrainEpisode, 'exid'>;
    series?: Pick<BrainSeries, 'exid'>;
  };
}

/**
 * .what = generates episode and series continuables based on grain
 * .why = abstracts repetitive continuation logic for both atom and repl
 *
 * - for 'atom': returns { episode, series: null }
 * - for 'repl': returns { episode, series }
 *
 * .note = immutable — always returns NEW instances, never mutates input
 * .note = async for cross-platform portability
 */
export async function genBrainContinuables(
  input: GenBrainContinuablesInput<'atom'>,
): Promise<{ episode: BrainEpisode; series: null }>;
export async function genBrainContinuables(
  input: GenBrainContinuablesInput<'repl'>,
): Promise<{ episode: BrainEpisode; series: BrainSeries }>;
export async function genBrainContinuables(
  input: GenBrainContinuablesInput<BrainGrain>,
): Promise<{ episode: BrainEpisode; series: BrainSeries | null }> {
  // determine prior episode: explicit or last from series
  const priorEpisode =
    input.on.episode ?? input.on.series?.episodes.at(-1) ?? null;

  // generate exchange from raw input
  const exchange = await genBrainExchange({
    with: input.with.exchange,
  });

  // generate new episode with prior exchanges + new exchange
  const episode = await genBrainEpisode({
    on: { episode: priorEpisode },
    with: {
      exchange,
      exid: input.with.episode?.exid ?? null,
    },
  });

  // for atom: no series support
  if (input.for.grain === 'atom') {
    return { episode, series: null };
  }

  // for repl: generate new series with prior episodes + new episode
  const series = await genBrainSeries({
    on: { series: input.on.series ?? null },
    with: {
      episode,
      exid: input.with.series?.exid ?? null,
    },
  });

  return { episode, series };
}
