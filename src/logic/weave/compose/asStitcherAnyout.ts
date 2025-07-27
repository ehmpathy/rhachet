import { Threads } from '../../../domain/objects';
import { GStitcher, Stitcher } from '../../../domain/objects/Stitcher';

/**
 * .what = safely casts a stitcher to preserve threads + context, but treat output as `any`
 * .why =
 *   - allows reuse of stitchers when only the input shape matters
 *   - ignores the output type, making it flexible for routes that discard outputs
 *   - avoids mismatches when flattening or combining steps
 */
export const asStitcherAnyout = <
  TDesired extends GStitcher<Threads<any>, any, any>,
>(
  input: Stitcher<GStitcher<TDesired['threads'], TDesired['context'], any>>,
): Stitcher<GStitcher<TDesired['threads'], TDesired['context'], any>> => input;
