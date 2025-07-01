import { Stitch } from '../../domain/objects/Stitch';
import { GStitcher, StitcherImagine } from '../../domain/objects/Stitcher';

/**
 * .what = invokes the imagine stitcher by invocation of stitcher mechanisms
 */
export const invokeImagineStitcher = async <TStitcher extends GStitcher>(
  input: {
    stitcher: StitcherImagine<TStitcher>;
    threads: TStitcher['threads'];
  },
  context: TStitcher['procedure']['context'],
): Promise<Stitch<TStitcher['output']>> => {
  const { stitcher, threads } = input;

  // enprompt the thread
  const prompt = stitcher.enprompt({ threads });

  // invoke the imagination
  const imagined = await stitcher.imagine(prompt, context);

  // deprompt back into a stitch
  const stitch = stitcher.deprompt({
    threads,
    promptIn: prompt,
    promptOut: imagined,
  });

  // expose the stitch
  return stitch;
};
