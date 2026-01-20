import { DomainLiteral } from 'domain-objects';

import { BrainOutputMetrics } from './BrainOutputMetrics';

/**
 * .what = result of any brain invocation: output plus metrics
 * .why = pairs the caller's output with measurements from the invocation
 *
 * .note = every `.ask()` and `.act()` returns this shape
 */
export interface BrainOutput<TOutput> {
  /**
   * .what = the actual output from the brain
   */
  output: TOutput;

  /**
   * .what = size and cost measurements from the invocation
   */
  metrics: BrainOutputMetrics;
}

export class BrainOutput<TOutput>
  extends DomainLiteral<BrainOutput<TOutput>>
  implements BrainOutput<TOutput>
{
  public static nested = { metrics: BrainOutputMetrics };
}
