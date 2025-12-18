import type { UniDateTime } from '@ehmpathy/uni-time';
import { DomainLiteral } from 'domain-objects';

import type { Stitch } from './Stitch';
import type { Threads } from './Threads';

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
   * .what = the threads it was set with
   */
  threads: TThreads;
}
export class StitchSetEvent<TThreads extends Threads<any, 'single'>, TOutput>
  extends DomainLiteral<StitchSetEvent<TThreads, TOutput>>
  implements StitchSetEvent<TThreads, TOutput> {}
