import { DomainLiteral } from 'domain-objects';
import type { IsoPrice } from 'iso-price';
import type { IsoDuration } from 'iso-time';

/**
 * .what = static specification that the brain supplier publishes and guarantees
 * .why = enables callers to compare cost/gain before invocation
 *
 * .note = specifications are what the supplier guarantees:
 *   - context window capacity
 *   - price rates
 *   - benchmark scores
 *   - knowledge cutoff
 */
export interface BrainSpec {
  /**
   * .what = what it costs to use the brain
   */
  cost: {
    /**
     * .what = time costs (speed and latency)
     */
    time: {
      /**
       * .what = output token generation rate
       * .example = { tokens: 100, per: { seconds: 1 } } = 100 tokens/sec
       */
      speed: { tokens: number; per: IsoDuration };

      /**
       * .what = time to first token
       */
      latency: IsoDuration;
    };

    /**
     * .what = cash costs per token
     */
    cash: {
      /**
       * .what = unit of measurement for rates
       * .note = rates are per-token (already divided by 1M)
       */
      per: 'token';

      /**
       * .what = cache token rates
       */
      cache: {
        /**
         * .what = cost per cached input token read
         */
        get: IsoPrice;

        /**
         * .what = cost per input token written to cache
         */
        set: IsoPrice;
      };

      /**
       * .what = cost per input token
       */
      input: IsoPrice;

      /**
       * .what = cost per output token
       */
      output: IsoPrice;
    };
  };

  /**
   * .what = what you gain from the brain
   */
  gain: {
    /**
     * .what = size capabilities
     */
    size: {
      /**
       * .what = context window capacity in tokens
       */
      context: { tokens: number };
    };

    /**
     * .what = benchmark scores (0-100 scale)
     */
    grades: {
      /**
       * .what = SWE-bench score
       */
      swe?: number;

      /**
       * .what = MMLU score
       */
      mmlu?: number;

      /**
       * .what = HumanEval score
       */
      humaneval?: number;
    };

    /**
     * .what = knowledge cutoff date (ISO date stamp)
     * .example = '2025-04-01'
     */
    cutoff: string;

    /**
     * .what = trained domain scope
     */
    domain: 'ALL' | 'SOFTWARE';

    /**
     * .what = trained skill capabilities
     */
    skills: {
      /**
       * .what = trained for tool use
       */
      tooluse?: boolean;

      /**
       * .what = can process images
       */
      vision?: boolean;
    };
  };
}

export class BrainSpec extends DomainLiteral<BrainSpec> implements BrainSpec {}
