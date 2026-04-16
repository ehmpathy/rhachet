import { DomainLiteral } from 'domain-objects';
import type { IsoTimeStamp } from 'iso-time';

/**
 * .what = capacity status for a specific credential
 * .why = enables selection of credential with most capacity left
 */
export interface BrainAuthCapacity {
  /**
   * ref to the credential this capacity is for (by slug)
   */
  credential: { slug: string };

  /**
   * token usage metrics
   */
  tokens: {
    /**
     * unit of measurement
     */
    unit: 'percentage';

    /**
     * amount consumed
     */
    used: number;

    /**
     * total capacity
     */
    limit: number;

    /**
     * capacity left (limit - used)
     */
    left: number;
  };

  /**
   * when capacity resets
   * null if capacity is available (no reset needed)
   */
  refreshAt: IsoTimeStamp | null;
}

export class BrainAuthCapacity
  extends DomainLiteral<BrainAuthCapacity>
  implements BrainAuthCapacity {}
