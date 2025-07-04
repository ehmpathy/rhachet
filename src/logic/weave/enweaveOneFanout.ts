import { asUniDateTime } from '@ehmpathy/uni-time';

import { StitchFanout } from '../../domain/objects/StitchFanout';
import { StitchSetEvent } from '../../domain/objects/StitchSetEvent';
import { GStitcher } from '../../domain/objects/Stitcher';
import { withStitchTrail } from '../stitch/withStitchTrail';

/**
 * .what = mechanism to enweave a full stitch fanout
 * .how =
 *   - executes a Promise.all(.parallel) and .concluder of stitchers
 */
export const enweaveOneFanout = withStitchTrail(
  async <TStitcher extends GStitcher>(
    input: {
      stitcher: StitchFanout<TStitcher>;
      threads: TStitcher['threads'];
    },
    context: TStitcher['context'],
  ): Promise<StitchSetEvent<TStitcher>> => {
    // return the results
    return {
      occurredAt: asUniDateTime(new Date()),
      trail: context.stitch.trail,
      stitch: outputNow,
      threads: threadsNow,
    };
  },
);
