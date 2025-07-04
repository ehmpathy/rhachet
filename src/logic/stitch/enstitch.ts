import { asUniDateTime } from '@ehmpathy/uni-time';
import { UnexpectedCodePathError } from 'helpful-errors';

import { Stitch } from '../../domain/objects/Stitch';
import { StitchSetEvent } from '../../domain/objects/StitchSetEvent';
import { StitchStep } from '../../domain/objects/StitchStep';
import { GStitcher } from '../../domain/objects/Stitcher';
import { Thread } from '../../domain/objects/Thread';
import { invokeImagineStitcher } from './invokeImagineStitcher';

/**
 * .what = enstitche a single stitch step to produce a stitch
 */
export const enstitch = async <TStitcher extends GStitcher>(
  input: {
    stitcher: StitchStep<TStitcher>;
    threads: TStitcher['threads'];
  },
  context: TStitcher['context'],
): Promise<StitchSetEvent<TStitcher>> => {
  // enstitch the output
  const stitch: Stitch<TStitcher['output']> = await (() => {
    // if the stitcher is of type "compute", then execute the computation; // todo: add observability on duration
    if (input.stitcher.form === 'COMPUTE')
      return input.stitcher.invoke({ threads: input.threads }, context);

    // if the stitcher is of type "imagine", then execute the imagination // todo: add observability
    if (input.stitcher.form === 'IMAGINE')
      return invokeImagineStitcher(
        { stitcher: input.stitcher, threads: input.threads },
        context,
      );

    // otherwise, unsupported and unexpected; should have been compiletime prevented
    throw new UnexpectedCodePathError(
      'why did we get an unsupported stitcher.form?',
      { stitcher: input.stitcher },
    );
  })();

  // mutate the input thread to attach the new stitch
  const stitcheeKey = input.stitcher.stitchee;
  const stitcheeBefore =
    input.threads[stitcheeKey] ??
    UnexpectedCodePathError.throw('could not find stitchee from input.threads');

  // todo: deep clone from dobjs
  // const stitcheeAfter = stitcheeBefore.clone(
  //   // !: deep clone to ensure no shared state between threads; unblocks safe reuse and parallelism
  //   {
  //     stitches: [...stitcheeBefore.stitches, stitch], // append it
  //   },
  // );
  const stitcheeAfter = new Thread({
    ...stitcheeBefore,
    stitches: [...stitcheeBefore.stitches, stitch], // append it
  });

  // return the updates
  return StitchSetEvent.build({
    occurredAt: asUniDateTime(new Date()),
    trail: context.stitch.trail,
    stitch,
    threads: {
      ...input.threads,
      [stitcheeKey]: stitcheeAfter,
    },
  });
};
