import { asIsoTimeStamp, getDuration } from 'iso-time';

import type { Stitch } from '@src/domain.objects/Stitch';
import type { GStitcher } from '@src/domain.objects/Stitcher';
import type { StitchStepImagine } from '@src/domain.objects/StitchStep';

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
  const beganAt = asIsoTimeStamp(new Date());
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
  const endedAt = asIsoTimeStamp(new Date());
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
