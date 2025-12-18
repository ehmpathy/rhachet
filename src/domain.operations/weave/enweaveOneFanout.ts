import { asUniDateTime } from '@ehmpathy/uni-time';

import type { GStitcher } from '@src/domain.objects/Stitcher';
import type {
  StitchFanout,
  ThreadsFromFanout,
} from '@src/domain.objects/StitchFanout';
import { StitchSetEvent } from '@src/domain.objects/StitchSetEvent';
import type { Thread } from '@src/domain.objects/Thread';
import { enstitch } from '@src/domain.operations/stitch/enstitch';
import { withStitchTrail } from '@src/domain.operations/stitch/withStitchTrail';

import { enweaveOneStitcher } from './enweaveOneStitcher';

/**
 * .what = mechanism to enweave a full stitch fanout
 * .how =
 *   - executes a Promise.all(.parallels) and a .conclusion stitcher
 */
export const enweaveOneFanout = withStitchTrail(
  async <TStitcher extends GStitcher>(
    input: {
      stitcher: StitchFanout<TStitcher>;
      threads: TStitcher['threads'];
    },
    context: TStitcher['context'],
  ): Promise<StitchSetEvent<TStitcher['threads'], TStitcher['output']>> => {
    const { parallels, concluder } = input.stitcher;

    // enweave parallel stitchers concurrently
    const fanoutResults = await Promise.all(
      parallels.map((stitcher) =>
        enweaveOneStitcher({ stitcher, threads: input.threads }, context),
      ),
    );

    // merge fanout results into grouped threads by role
    const threadsAfterFanout = fanoutResults.reduce(
      (acc, result) => {
        for (const role of Object.keys(
          result.threads,
        ) as (keyof TStitcher['threads'])[]) {
          const thread = result.threads[role]!;

          if (!acc[role]) acc[role] = { seed: input.threads[role]!, peers: [] };
          acc[role]!.peers.push(thread);
        }

        return acc;
      },
      {} as {
        [K in keyof TStitcher['threads']]?: {
          seed: Thread<any>;
          peers: Thread<any>[];
        };
      },
    ) as ThreadsFromFanout<TStitcher>;

    // execute the concluder stitcher with the fanout threads
    const { stitch: finalStitch, threads: finalThreads } = await enstitch(
      { stitcher: concluder, threads: threadsAfterFanout },
      context,
    );

    // declare the result
    return StitchSetEvent.build({
      occurredAt: asUniDateTime(new Date()),
      stitch: finalStitch,
      threads: finalThreads,
    });
  },
);
