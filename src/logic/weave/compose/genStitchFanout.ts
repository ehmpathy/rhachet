import { Stitcher, GStitcher } from '../../../domain/objects/Stitcher';
import { GStitcherInferred } from './GStitcherInferred.generic';

/**
 * .what = generates a stitcher that fans out to multiple parallel stitchers, then concludes with a final one
 * .why =
 *   - enables parallel feedback or computation from multiple perspectives
 *   - merges results into a final output via the concluding stitcher
 */
export const genStitchFanout = <
  TParallels extends readonly [Stitcher<GStitcher>, ...Stitcher<GStitcher>[]],
  TConcluder extends Stitcher<GStitcher>,
>(input: {
  slug: string;
  parallels: TParallels;
  concluder: TConcluder;
}): Stitcher<GStitcherInferred<[...TParallels, TConcluder]>> => {
  return {
    form: 'ROUTE',
    slug: input.slug,
    sequence: [...input.parallels, input.concluder] as const,
  } as unknown as Stitcher<GStitcherInferred<[...TParallels, TConcluder]>>;
};
