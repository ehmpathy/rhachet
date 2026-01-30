import { DomainLiteral } from 'domain-objects';

import { BrainEpisode } from './BrainEpisode';

/**
 * .what = chain of episodes bridged by compaction — the BrainRepl's unit of continuity across context windows
 * .why = enables continuation via `{ on: { series } }` for BrainRepl only
 *
 * .scope = 1..N context windows; spans as many episodes as needed
 * .boundary = explicit end or abandon (persists across compaction)
 * .note = BrainAtom is stateless and has no series awareness; returns null for series
 */
export interface BrainSeries {
  /**
   * .what = content-derived identity
   * .why = enables comparison and deduplication based on actual content
   *
   * .note = computed from episode hashes
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
   * .what = ordered list of episodes in this series
   * .why = captures the full conversation history across compaction boundaries
   *
   * .note = append-only semantics; compaction summaries are embedded as first exchange of subsequent episodes
   */
  episodes: BrainEpisode[];
}

export class BrainSeries
  extends DomainLiteral<BrainSeries>
  implements BrainSeries
{
  public static nested = { episodes: BrainEpisode };
}
