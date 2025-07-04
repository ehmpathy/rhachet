import { StitchRoute } from '../../../domain/objects/StitchRoute';
import { GStitcher, Stitcher } from '../../../domain/objects/Stitcher';
import { Threads } from '../../../domain/objects/Threads';
import { GStitcherInferredFromRoute } from './GStitcherInferredFromRoute.generic';

/**
 * .what = generates a thoroughly typesafe stitch route
 * .why =
 *   - ensures typescript considers the input stitcher sequence to infer a composite stitcher for the stitch route declaration
 *   - results in a composite superset type of threads and context, plus accurate output type, on the output
 */
export const genStitchRoute = <
  TSequence extends readonly [
    // note: we only need to support single threaded here
    Stitcher<GStitcher<Threads<any, 'single'>, any, any>>,
    ...Stitcher<GStitcher<Threads<any, 'single'>, any, any>>[],
  ],
>(input: {
  slug: string;
  readme: string | null;
  sequence: TSequence;
}): StitchRoute<GStitcherInferredFromRoute<TSequence>> => {
  return new StitchRoute({
    form: 'ROUTE',
    slug: input.slug,
    readme: input.readme,
    sequence: input.sequence as any,
  });
};
