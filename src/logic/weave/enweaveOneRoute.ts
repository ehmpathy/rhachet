import { Stitch } from '../../domain/objects/Stitch';
import { StitchRoute } from '../../domain/objects/StitchRoute';
import { GStitcher } from '../../domain/objects/Stitcher';
import { enstitch } from '../stitch/enstitch';

/**
 * .what = mechanism to enweave a full stitch route
 * .how =
 *   - executes each stitcher in sequence
 */
export const enweaveOneRoute = async <TStitcher extends GStitcher>(
  input: {
    route: StitchRoute<TStitcher>;
    threads: TStitcher['threads'];
  },
  context: TStitcher['procedure']['context'],
): Promise<{
  stitch: Stitch<TStitcher['output']>;
  threads: TStitcher['threads'];
}> => {
  // track the latest state of the threads
  let threadsNow: TStitcher['threads'] = input.threads;

  // track the last output
  let outputNow: any = null;

  // for each stitcher in the route.sequence, execute it one by one
  for (const stitcher of input.route.sequence) {
    // execute the stitcher
    const { stitch, threads } = await enstitch(
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
    stitch: outputNow,
    threads: threadsNow,
  };
};
