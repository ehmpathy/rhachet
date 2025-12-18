import type { UniDuration } from '@ehmpathy/uni-time';
import type { PickAny } from 'type-fns';

import { StitchCycle } from '@src/domain.objects/StitchCycle';
import type {
  GStitcher,
  GStitcherFlat,
  Stitcher,
} from '@src/domain.objects/Stitcher';
import type { Threads } from '@src/domain.objects/Threads';

import type { GStitcherInferredFromCycle } from './GStitcherInferredFromCycle.generic';

/**
 * .what = generates a stitcher that repeats a step until the decider returns 'release' or 'halt'
 * .why =
 *   - supports runtime loops with fine-grained flow control
 * .note =
 *   - decider must return { choice: 'repeat' | 'release' | 'halt' }
 *   - halter is optional; defaults applied internally to prevent infinite loops
 */
export const genStitchCycle = <
  TRepeatee extends Stitcher<GStitcher<Threads<any, 'single'>, any, any>>,
  TDecider extends Stitcher<
    GStitcher<
      Threads<any, 'single'>,
      any,
      { choice: 'repeat' | 'release' | 'halt' }
    >
  >,
>(input: {
  slug: string;
  readme: string | null;
  repeatee: TRepeatee;
  decider: TDecider;
  halter?: {
    threshold: PickAny<{
      repetitions: number;
      duration: UniDuration;
    }>;
  };
}): StitchCycle<
  GStitcherFlat<GStitcherInferredFromCycle<TRepeatee, TDecider>>
> => {
  return new StitchCycle({
    form: 'CYCLE',
    slug: input.slug,
    readme: input.readme,
    repeatee: input.repeatee as any,
    decider: input.decider as any,
    halter: input.halter ?? {
      threshold: {
        // safe by default
        repetitions: 100,
        duration: { hours: 1 },
      },
    },
  });
};
