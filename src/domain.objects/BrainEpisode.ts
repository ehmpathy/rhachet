import { DomainLiteral } from 'domain-objects';

import { BrainExchange } from './BrainExchange';

/**
 * .what = one context window of exchanges — the unit of continuity within a single context capacity
 * .why = enables continuation via `{ on: { episode } }` for both BrainAtom and BrainRepl
 *
 * .scope = one context window; all exchanges share the same context
 * .boundary = compaction (episode ends when context window fills)
 * .note = immutable after creation; hash is content-derived from exchange hashes
 */
export interface BrainEpisode {
  /**
   * .what = content-derived identity
   * .why = enables comparison and deduplication based on actual content
   *
   * .note = computed from exchange hashes
   */
  hash: string;

  /**
   * .what = supplier-assigned external id
   * .why = allows suppliers to track their own ids
   *
   * .note = opaque to rhachet; null if not provided by supplier
   */
  exid: string | null;

  /**
   * .what = ordered list of exchanges in this episode
   * .why = captures the conversation history within one context window
   *
   * .note = append-only semantics; never mutate, always create new episode
   */
  exchanges: BrainExchange[];
}

export class BrainEpisode
  extends DomainLiteral<BrainEpisode>
  implements BrainEpisode
{
  public static nested = { exchanges: BrainExchange };
}
