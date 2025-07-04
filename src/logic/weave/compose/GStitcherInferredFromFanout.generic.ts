import { ThreadsFromFanout } from '../../../domain/objects/StitchFanout';
import { StitchStep } from '../../../domain/objects/StitchStep';
import { GStitcher, Stitcher } from '../../../domain/objects/Stitcher';
import { GStitcherInferredFromRoute } from './GStitcherInferredFromRoute.generic';
import { ProcedureContextMerged } from './ProcedureContextMerged.generic';
import { ThreadsMerged } from './ThreadsMerged.generic';

/**
 * .what = a mech to infer a GStitcher from a StitchFanout setup
 *   - i.e., infers the composite stitcher for StitchFanout
 * .how =
 *   - merges the required threads from all parallels
 *   - merges the required procedure.context into a superset
 *   - uses the concluder's output as the final output
 * .note =
 *   - parallels must be typed as const
 *   - concluder must accept ThreadsFromFanout
 */
export type GStitcherInferredFromFanout<
  TParallels extends readonly [Stitcher<GStitcher>, ...Stitcher<GStitcher>[]],
  TConcluder extends StitchStep<
    GStitcher<
      ThreadsFromFanout<GStitcherInferredFromRoute<TParallels>>,
      any,
      any
    >
  >,
> = GStitcher<
  ThreadsMerged<{
    [K in keyof TParallels]: TParallels[K] extends Stitcher<infer G>
      ? G['threads']
      : never;
  }>,
  ProcedureContextMerged<{
    // todo: include the TConcluder's context too
    [K in keyof TParallels]: TParallels[K] extends Stitcher<infer G>
      ? G['context']
      : never;
  }> &
    GStitcher['context'],
  TConcluder extends StitchStep<infer G> ? G['output'] : never
>;
