import { GStitcher, Stitcher } from '../../../domain/objects/Stitcher';
import { Threads } from '../../../domain/objects/Threads';

/**
 * .what = narrows a stitcher with deeply inferred or recursive types into a pre-flattened form
 * .why =
 *   - enables you to simplify the types youre looking at, against what you expect
 *   - avoids TS2589 (excessively deep type instantiation), by memoization of the shape, tested against the inferred types of the stitcher so far
 *   - ensures downstream use of `asStitcher(...)` stays composable
 */
export const asStitcherFlat = <
  Flat extends GStitcher<Threads<any, 'single'>, any, any>,
>(
  input: Stitcher<Flat>,
): Stitcher<Flat> => input;
