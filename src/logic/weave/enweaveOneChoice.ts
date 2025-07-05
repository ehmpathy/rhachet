import { asUniDateTime } from '@ehmpathy/uni-time';
import { UnexpectedCodePathError } from 'helpful-errors';

import { StitchChoice } from '../../domain/objects/StitchChoice';
import { StitchSetEvent } from '../../domain/objects/StitchSetEvent';
import { asStitchTrailDesc } from '../../domain/objects/StitchTrail';
import { asStitcherDesc, GStitcher } from '../../domain/objects/Stitcher';
import { withStitchTrail } from '../stitch/withStitchTrail';
import { enweaveOneStitcher } from './enweaveOneStitcher';

/**
 * .what = executes a StitchChoice by first running the decider to choose an option, then running the chosen option
 * .why =
 *   - enables runtime branching based on input, context, or prior stitches
 *   - helps model decision trees, dynamic workflows, and rule-based logic
 *   - separates decision logic (decider) from action logic (options)
 */
export const enweaveOneChoice = withStitchTrail(
  async <TStitcher extends GStitcher>(
    input: {
      stitcher: StitchChoice<TStitcher>;
      threads: TStitcher['threads'];
    },
    context: TStitcher['context'],
  ): Promise<StitchSetEvent<TStitcher['threads'], TStitcher['output']>> => {
    const { decider, options } = input.stitcher;

    // run the decider
    const { stitch: decisionStitch, threads: threadsAfterDecide } =
      await enweaveOneStitcher(
        {
          stitcher: decider,
          threads: input.threads,
        },
        context,
      );

    // grab the chosen stitcher slug
    const slugChosen = decisionStitch.output?.choice?.slug;
    if (typeof slugChosen !== 'string')
      UnexpectedCodePathError.throw('no slug chosen from decider', {
        decisionStitch,
      });

    // find the chosen stitcher
    const chosenStitcher =
      options.find((s) => s.slug === slugChosen) ??
      UnexpectedCodePathError.throw('could not find chosen option', {
        decisionStitch,
        slugChosen,
        options: options.map((option) => option.slug),
      });

    // run the chosen stitcher
    const { stitch: resultStitch, threads: threadsAfterChoice } =
      await enweaveOneStitcher(
        {
          stitcher: chosenStitcher,
          threads: threadsAfterDecide,
        },
        context,
      );

    // declare the result
    return StitchSetEvent.build({
      occurredAt: asUniDateTime(new Date()),
      stitch: resultStitch,
      stitcher: {
        ...asStitcherDesc({ stitcher: input.stitcher }),
        trail: asStitchTrailDesc({ trail: context.stitch.trail }),
      },
      threads: threadsAfterChoice,
    });
  },
);
