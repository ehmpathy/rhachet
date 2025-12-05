import { asUniDateTime, getDuration } from '@ehmpathy/uni-time';

import type { Stitch } from '../../domain/objects/Stitch';
import type { GStitcher } from '../../domain/objects/Stitcher';
import type { StitchStepImagine } from '../../domain/objects/StitchStep';

/**
 * .what = invokes the imagine stitcher by invocation of stitcher mechanisms
 */
export const invokeImagineStitcher = async <TStitcher extends GStitcher>(
  input: {
    stitcher: StitchStepImagine<TStitcher>;
    threads: TStitcher['threads'];
  },
  context: TStitcher['context'],
): Promise<Pick<Stitch<TStitcher['output']>, 'input' | 'output'>> => {
  const { stitcher, threads } = input;

  // todo: generalize logs
  const beganAt = asUniDateTime(new Date());
  console.log(`🧠 imagine.began:${input.stitcher.slug}`, { beganAt });

  // enprompt the thread
  const prompt = await stitcher.enprompt({ threads });

  // invoke the imagination
  const imagined = await stitcher.imagine(prompt, context);

  // deprompt back into a stitch
  const stitch = stitcher.deprompt({
    threads,
    promptIn: prompt,
    promptOut: imagined,
  });

  // todo: generalize logs
  const endedAt = asUniDateTime(new Date());
  const duration = getDuration({
    of: { range: { since: beganAt, until: endedAt } },
  });
  console.log(`🧠 imagine.ended:${input.stitcher.slug}`, {
    endedAt,
    duration,
  });

  // expose the stitch
  return stitch;
};
