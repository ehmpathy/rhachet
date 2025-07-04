import { UniDateTime } from '@ehmpathy/uni-time';
import { DomainLiteral } from 'domain-objects';

import { Stitch } from './Stitch';
import { StitchTrail } from './StitchTrail';
import { GStitcher } from './Stitcher';

/**
 * .what = an event that describes the occurrence of a stich being set
 */
export interface StitchSetEvent<TStitcher extends GStitcher> {
  /**
   * .what = when the stitch was set
   */
  occurredAt: UniDateTime;

  /**
   * .what = the trail from which this stitch was set
   */
  trail: StitchTrail;

  /**
   * .what = the stitch which was set
   */
  stitch: Stitch<TStitcher['output']>;

  /**
   * .what = the threads it was set with
   */
  threads: TStitcher['threads'];
}
export class StitchSetEvent<TStitcher extends GStitcher>
  extends DomainLiteral<StitchSetEvent<TStitcher>>
  implements StitchSetEvent<TStitcher> {}
