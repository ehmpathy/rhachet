import { DomainEntity } from 'domain-objects';
import type { IsoTimeStamp } from 'iso-time';
import type { Uuid } from 'uuid-fns';

import type { StitcherDesc } from './Stitcher';
import type { StitchTrail, StitchTrailDesc } from './StitchTrail';

export interface Stitch<TOutput> {
  // todo: some declaration of invalidation triggers? (or is that assumption based)
  // todo: some exid to distinctly refer to it? i.e., how will dependencies be declared?

  /**
   * .what = a unique identifier for the stitch
   */
  uuid: Uuid;

  /**
   * .what = when the stitch was set
   */
  createdAt: IsoTimeStamp;

  /**
   * .what = the stitcher that set it
   * .note =
   *   - may be null if it was a manually created stitch
   */
  stitcher: StitcherDesc<any> | null;

  /**
   * .what = the trail from which the stitch came
   * .note =
   *   - the markers may not always be present today // todo: hide them on output, instead of on input, longterm
   *   - the trail itself may not be declared, e.g., if it was a manually created stitch
   */
  trail: { desc: StitchTrailDesc; markers?: StitchTrail } | null;

  /**
   * .what = the prompt input which caused the output
   */
  input: any;

  /**
   * .what = the output of the stitch
   */
  output: TOutput;
}
export class Stitch<TOutput>
  extends DomainEntity<Stitch<TOutput>>
  implements Stitch<TOutput>
{
  public static primary = ['uuid'] as const;
}
