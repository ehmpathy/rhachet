import { DomainLiteral } from 'domain-objects';

import { BrainEpisode } from './BrainEpisode';
import type { BrainGrain } from './BrainGrain';
import { BrainOutputMetrics } from './BrainOutputMetrics';
import type { BrainPlugs } from './BrainPlugs';
import type { BrainPlugToolDefinition } from './BrainPlugToolDefinition';
import type { BrainPlugToolInvocation } from './BrainPlugToolInvocation';
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
 * .what = conditional type for calls based on whether tools are plugged
 * .why = narrows calls to null when no tools, { tools } | null when tools present
 */
export type AsBrainOutputCallsFor<TPlugs extends BrainPlugs> = TPlugs extends {
  tools: BrainPlugToolDefinition[];
}
  ? { tools: BrainPlugToolInvocation[] } | null
  : null;

/**
 * .what = conditional type for output based on whether tools are plugged
 * .why = narrows output to TOutput | null when tools present (brain may defer)
 */
export type AsBrainOutputOutputFor<
  TOutput,
  TPlugs extends BrainPlugs,
> = TPlugs extends { tools: BrainPlugToolDefinition[] }
  ? TOutput | null
  : TOutput;

/**
 * .what = result of any brain invocation: output, calls, episode, series, plus metrics
 * .why = pairs the caller's output with conversation state and measurements
 *
 * .note = every `.ask()` and `.act()` returns this shape
 */
export interface BrainOutput<
  TOutput,
  TBrainGrain extends BrainGrain = BrainGrain,
  TPlugs extends BrainPlugs = BrainPlugs,
> {
  /**
   * .what = the actual output from the brain
   * .note = null when brain defers to tool calls (only if tools are plugged)
   */
  output: AsBrainOutputOutputFor<TOutput, TPlugs>;

  /**
   * .what = tool invocations the brain requests
   * .why = enables callers to execute tools and continue the episode
   *
   * .note = null when no tools are plugged or when brain answers directly
   */
  calls: AsBrainOutputCallsFor<TPlugs>;

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

export class BrainOutput<
    TOutput,
    TBrainGrain extends BrainGrain = BrainGrain,
    TPlugs extends BrainPlugs = BrainPlugs,
  >
  extends DomainLiteral<BrainOutput<TOutput, TBrainGrain, TPlugs>>
  implements BrainOutput<TOutput, TBrainGrain, TPlugs>
{
  public static nested = {
    metrics: BrainOutputMetrics,
    episode: BrainEpisode,
    series: BrainSeries,
  };
}
