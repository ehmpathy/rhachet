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
     *
     * .note = recommended baseline set, chosen for differentiation at frontier:
     *   - saturated benchmarks (MMLU, HumanEval) removed
     *   - contamination-resistant benchmarks preferred
     *   - suppliers may add custom grades via index signature
     */
    grades: {
      /**
       * .what = SWE-bench Verified score (software task resolution)
       * .note = deprecated: 500 Python-only tasks, contaminated
       * @see https://www.swebench.com/
       */
      sweVer?: number;

      /**
       * .what = SWE-bench Pro score (software task resolution)
       * .note = current standard: 1,865 tasks across 123 languages
       * @see https://www.swebench.com/
       */
      swePro?: number;

      /**
       * .what = GPQA Diamond score (graduate-level science Q&A)
       * .note = PhD-level Q&A in biology, chemistry, physics
       * @see https://arxiv.org/abs/2311.12022
       */
      gpqa?: number;

      /**
       * .what = MATH Level 5 score (competition mathematics)
       * .note = high-school competition math problems
       * @see https://arxiv.org/abs/2103.03874
       */
      math?: number;

      /**
       * .what = IFEval score (instruction compliance)
       * .note = measures ability to follow explicit instructions precisely
       * @see https://arxiv.org/abs/2311.07911
       */
      ifeval?: number;

      /**
       * .what = ARC-AGI-2 score (abstract reason)
       * .note = frontier benchmark for general intelligence capabilities
       * @see https://arcprize.org/
       */
      arcagi?: number;

      /**
       * .what = custom grades from suppliers
       * .note = allows suppliers to report additional benchmarks not in baseline
       */
      [key: string]: number | undefined;
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
