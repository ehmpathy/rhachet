import {
  StitchFanout,
  ThreadsFromFanout,
} from '../../../domain/objects/StitchFanout';
import { StitchStep } from '../../../domain/objects/StitchStep';
import { GStitcher, Stitcher } from '../../../domain/objects/Stitcher';
import { GStitcherInferredFromFanout } from './GStitcherInferredFromFanout.generic';

/**
 * .what = generates a stitcher that fans out to multiple parallel stitchers, then concludes with a final one
 * .why =
 *   - enables parallel feedback or computation from multiple perspectives
 *   - merges results into a final output via the concluding stitcher
 */
export const genStitchFanout = <
  TParallels extends readonly [Stitcher<GStitcher>, ...Stitcher<GStitcher>[]],
  TConcluder extends StitchStep<
    GStitcher<
      ThreadsFromFanout<GStitcherInferredFromFanout<TParallels, TConcluder>>,
      any,
      any
    >
  >,
>(input: {
  slug: string;
  readme: string | null;
  parallels: TParallels;
  concluder: TConcluder;
}): StitchFanout<GStitcherInferredFromFanout<TParallels, TConcluder>> => {
  return new StitchFanout({
    form: 'FANOUT',
    slug: input.slug,
    readme: input.readme,
    parallels: input.parallels as any,
    concluder: input.concluder as any,
  });
};
