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
  TSequence extends readonly [Stitcher<GStitcher>, ...Stitcher<GStitcher>[]],
>(input: {
  slug: string;
  readme: string | null;
  sequence: TSequence;
}): StitchRoute<GStitcherInferred<TSequence>> => {
  return new StitchRoute({
    form: 'ROUTE',
    slug: input.slug,
    readme: input.readme,
    sequence: input.sequence as any,
  });
};
