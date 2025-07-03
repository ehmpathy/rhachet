import { Stitcher, GStitcher } from '../../../domain/objects/Stitcher';
import { GStitcherInferred } from './GStitcherInferred.generic';

/**
 * .what = generates a stitcher that fans out to multiple parallel stitchers, then concludes with a final one
 * .why =
 *   - enables parallel feedback or computation from multiple perspectives
 *   - merges results into a final output via the concluding stitcher
 */
export const genStitchFanout = <
  TParallels extends readonly [
    Stitcher<GStitcher<any, any, any>>,
    ...Stitcher<GStitcher<any, any, any>>[],
  ],
  TConclusion extends Stitcher<GStitcher<any, any, any>>,
>(input: {
  parallels: TParallels;
  conclusion: TConclusion;
}): Stitcher<GStitcherInferred<[...TParallels, TConclusion]>> => {
  return {
    form: 'ROUTE', // if you’re using a special form, or otherwise mark as synthetic
    slug: `[fanout]:<${input.parallels.length}+1>`,
    sequence: [...input.parallels, input.conclusion] as const,
  } as unknown as Stitcher<GStitcherInferred<[...TParallels, TConclusion]>>;
};
