import { Stitcher, GStitcher } from '../../../domain/objects/Stitcher';
import { Threads } from '../../../domain/objects/Threads';

/**
 * .what = applies a standardized type wrapper around a stitcher to enforce single-thread compatibility
 * .note
 *   - forces Threads<,single>, since by definition generic stitchers are always single threaded per role
 * .why =
 *   - enables composition of stitchers
 *   - without this, they're not composable, due to typescript(generic invariance on classes cause)
 *   - infers the type deeply
 */

export const asStitcher = <T extends Stitcher<GStitcher<any, any, any>>>(
  input: T,
): T extends Stitcher<GStitcher<infer TThreads, infer TContext, infer TOutput>>
  ? Stitcher<
      GStitcher<
        Threads<
          TThreads extends Threads<infer TContextDict, any>
            ? TContextDict
            : never,
          'single'
        >,
        TContext,
        TOutput
      >
    >
  : never => input as any;
