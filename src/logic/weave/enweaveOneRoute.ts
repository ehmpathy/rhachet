import { asUniDateTime } from '@ehmpathy/uni-time';

import { StitchRoute } from '../../domain/objects/StitchRoute';
import { StitchSetEvent } from '../../domain/objects/StitchSetEvent';
import { GStitcher } from '../../domain/objects/Stitcher';
import { withStitchTrail } from '../stitch/withStitchTrail';
import { enweaveOneStitcher } from './enweaveOneStitcher';

/**
 * .what = mechanism to enweave a full stitch route
 * .how =
 *   - executes a .sequence of stitchers
 */
export const enweaveOneRoute = withStitchTrail(
  async <TStitcher extends GStitcher>(
    input: {
      stitcher: StitchRoute<TStitcher>;
      threads: TStitcher['threads'];
    },
    context: TStitcher['context'],
  ): Promise<StitchSetEvent<TStitcher['threads'], TStitcher['output']>> => {
    // track the latest state of the threads
    let threadsNow: TStitcher['threads'] = input.threads;

    // track the last output
    let outputNow: any = null;

    // for each stitcher in the route.sequence, execute it one by one
    for (const stitcher of input.stitcher.sequence) {
      // execute the stitcher
      const { stitch, threads } = await enweaveOneStitcher(
        { stitcher, threads: threadsNow },
        context,
      );

      // update the latest states
      threadsNow = threads; // enables subsequent stitchers to leverage prior results
      outputNow = stitch;
    }

    // return the results
    return StitchSetEvent.build({
      occurredAt: asUniDateTime(new Date()),
      stitch: outputNow,
      threads: threadsNow,
    });
  },
);
