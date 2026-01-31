import { DomainLiteral } from 'domain-objects';

import { BrainEpisode } from './BrainEpisode';
import type { BrainGrain } from './BrainGrain';
import { BrainOutputMetrics } from './BrainOutputMetrics';
import { BrainSeries } from './BrainSeries';

/**
 * .what = conditional type for series based on brain choice
 * .why = enforces type-safe series: null for atom, BrainSeries for repl
 */
export type AsBrainOutputSeriesFor<T extends BrainGrain> = T extends 'repl'
  ? BrainSeries
  : T extends 'atom'
    ? null
    : BrainSeries | null;

/**
 * .what = result of any brain invocation: output, episode, series, plus metrics
 * .why = pairs the caller's output with conversation state and measurements
 *
 * .note = every `.ask()` and `.act()` returns this shape
 */
export interface BrainOutput<
  TOutput,
  TBrainGrain extends BrainGrain = BrainGrain,
> {
  /**
   * .what = the actual output from the brain
   */
  output: TOutput;

  /**
   * .what = size and cost measurements from the invocation
   */
  metrics: BrainOutputMetrics;

  /**
   * .what = the episode with exchanges from this invocation
   * .why = enables continuation via `on.episode`
   */
  episode: BrainEpisode;

  /**
   * .what = the series with episodes (repl only)
   * .why = enables continuation via `on.series` (repl only, null for atom)
   */
  series: AsBrainOutputSeriesFor<TBrainGrain>;
}

export class BrainOutput<TOutput, TBrainGrain extends BrainGrain = BrainGrain>
  extends DomainLiteral<BrainOutput<TOutput, TBrainGrain>>
  implements BrainOutput<TOutput, TBrainGrain>
{
  public static nested = {
    metrics: BrainOutputMetrics,
    episode: BrainEpisode,
    series: BrainSeries,
  };
}
