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
  ): Promise<StitchSetEvent<TStitcher>> => {
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

      // expose for observability
      // console.log(JSON.stringify(stitch, null, 2));
      console.log('input', stitch.input);
      console.log('output', stitch.output);
      // todo: emit event to ObserverContext, that the stitch was completed; todo: do this within stitcher? both? e.g., enweave.checkpoint vs enstitch.checkpoint
    }

    // return the results
    return {
      occurredAt: asUniDateTime(new Date()),
      trail: context.stitch.trail,
      stitch: outputNow,
      threads: threadsNow,
    };
  },
);
