import { StitchRoute } from '../../../domain/objects/StitchRoute';
import { GStitcher, Stitcher } from '../../../domain/objects/Stitcher';
import { GStitcherInferred } from './GStitcherInferred.generic';

/**
 * .what = generates a thoroughly typesafe stitch route
 * .why =
 *   - ensures typescript considers the input stitcher sequence to infer a composite stitcher for the stitch route declaration
 *   - results in a composite superset type of threads and context, plus accurate output type, on the output
 */
export const genStitchRoute = <
  TSequence extends readonly [
    Stitcher<GStitcher<any, any, any>>,
    ...Stitcher<GStitcher<any, any, any>>[],
  ],
>(input: {
  slug: string;
  name: string;
  description: string | null;
  sequence: TSequence;
}): StitchRoute<GStitcherInferred<TSequence>> => {
  return {
    slug: input.slug,
    name: input.name,
    description: input.description,
    sequence: input.sequence as any,
  };
};
