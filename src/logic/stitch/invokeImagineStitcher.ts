import { Stitch } from '../../domain/objects/Stitch';
import { StitcherImagine } from '../../domain/objects/Stitcher';
import { Thread } from '../../domain/objects/Thread';

/**
 * .what = invokes the imagine stitcher by invocation of stitcher mechanisms
 */
export const invokeImagineStitcher = async <
  TThreadContext,
  TProcedureContext,
  TOutput,
>(
  input: {
    stitcher: StitcherImagine<TThreadContext, TProcedureContext, TOutput>;
    thread: Thread<TThreadContext>;
  },
  context: TProcedureContext,
): Promise<Stitch<TOutput>> => {
  const { stitcher, thread } = input;

  // enprompt the thread
  const prompt = stitcher.enprompt({ thread });

  // invoke the imagination
  const imagined = await stitcher.imagine(prompt, context);

  // deprompt back into a stitch
  const stitch = stitcher.deprompt({
    thread,
    promptIn: prompt,
    promptOut: imagined,
  });

  // expose the stitch
  return stitch;
};
