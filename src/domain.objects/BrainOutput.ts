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
 * .what = extracts TInput from a BrainPlugToolDefinition
 * .why = enables typed tool invocations in BrainOutput.calls
 */
type ExtractToolInput<T> =
  T extends BrainPlugToolDefinition<infer TInput, unknown, BrainGrain, string>
    ? TInput
    : unknown;

/**
 * .what = extracts union of TInput from array of BrainPlugToolDefinition
 * .why = enables typed tool invocations when multiple tools are plugged
 */
type ExtractToolsInput<T> = T extends readonly BrainPlugToolDefinition[]
  ? ExtractToolInput<T[number]>
  : unknown;

/**
 * .what = conditional type for calls based on grain and whether tools are plugged
 * .why = narrows calls to null for repl (executes internally), { tools } | null for atom with tools
 *
 * .note
 * - repls never return tool calls (they execute tools via .execute)
 * - atoms may return tool calls for caller to handle
 * - invocations are typed with the union of all plugged tool inputs
 */
export type AsBrainOutputCallsFor<
  TPlugs extends BrainPlugs,
  TGrain extends BrainGrain = BrainGrain,
> = TGrain extends 'repl'
  ? null // repls execute tools internally, never return calls
  : TGrain extends 'atom'
    ? TPlugs extends {
        tools: infer TTools extends readonly BrainPlugToolDefinition[];
      }
      ? { tools: BrainPlugToolInvocation<ExtractToolsInput<TTools>>[] } | null
      : null
    : // fallback for unknown grain
      TPlugs extends {
          tools: infer TTools extends readonly BrainPlugToolDefinition[];
        }
      ? { tools: BrainPlugToolInvocation<ExtractToolsInput<TTools>>[] } | null
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
   * .note
   * - null for repl (repls execute tools internally)
   * - null when no tools are plugged
   * - null when brain answers directly (atom with tools)
   */
  calls: AsBrainOutputCallsFor<TPlugs, TBrainGrain>;

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
