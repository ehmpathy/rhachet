import { DomainLiteral } from 'domain-objects';
import type { IsoPrice } from 'iso-price';
import type { IsoDuration } from 'iso-time';

/**
 * .what = size and cost measurements from a single brain invocation
 * .why = captures both size (tokens, chars) and cost (time, cash)
 */
export interface BrainOutputMetrics {
  /**
   * .what = size measurements
   */
  size: {
    /**
     * .what = token counts from the api response
     */
    tokens: {
      input: number;
      output: number;
      cache: { get: number; set: number };
    };

    /**
     * .what = character counts from the input/output strings
     */
    chars: {
      input: number;
      output: number;
      cache: { get: number; set: number };
    };
  };

  /**
   * .what = cost measurements
   */
  cost: {
    /**
     * .what = elapsed time for the invocation
     */
    time: IsoDuration;

    /**
     * .what = cash cost breakdown
     */
    cash: {
      /**
       * .what = total cost of the invocation
       */
      total: IsoPrice;

      /**
       * .what = cost breakdown by component
       */
      deets: {
        input: IsoPrice;
        output: IsoPrice;
        cache: { get: IsoPrice; set: IsoPrice };
      };
    };
  };
}

export class BrainOutputMetrics
  extends DomainLiteral<BrainOutputMetrics>
  implements BrainOutputMetrics {}
