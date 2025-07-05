import { UniDateTime } from '@ehmpathy/uni-time';
import { DomainLiteral } from 'domain-objects';

import { Stitch } from './Stitch';
import { StitchTrailDesc } from './StitchTrail';
import { StitcherDesc } from './Stitcher';
import { Threads } from './Threads';

/**
 * .what = an event that describes the occurrence of a stich being set
 */
export interface StitchSetEvent<
  TThreads extends Threads<any, 'single'>,
  TOutput,
> {
  /**
   * .what = when the stitch was set
   */
  occurredAt: UniDateTime;

  /**
   * .what = the stitch which was set
   */
  stitch: Stitch<TOutput>;

  /**
   * .what = the stitcher that set it
   * .note =
   *   - we bolton the trail that lead to that stitcher being used; seems like the most intuitive way to read the trail
   *   - otherwise, the trail on the event makes it seem like that's the round trip, which is actually within thread.history (since each thread goes on its own journey and then gets merged)
   */
  stitcher: StitcherDesc<any> & { trail: StitchTrailDesc };

  /**
   * .what = the threads it was set with
   */
  threads: TThreads;
}
export class StitchSetEvent<TThreads extends Threads<any, 'single'>, TOutput>
  extends DomainLiteral<StitchSetEvent<TThreads, TOutput>>
  implements StitchSetEvent<TThreads, TOutput> {}
