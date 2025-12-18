import type { GStitcher, Stitcher } from '@src/domain.objects/Stitcher';

import type {
  ProcedureContextMerged,
  ProcedureContextSpread,
} from './ProcedureContextMerged.generic';
import type { ThreadsMerged, ThreadsSpread } from './ThreadsMerged.generic';

/**
 * .what = infers a composite GStitcher from a StitchChoice config
 * .how =
 *   - threads: merged from options + decider
 *   - context: merged from options + decider
 *   - output: union of option outputs
 */
export type GStitcherInferredFromChoice<
  TOptions extends readonly [Stitcher<GStitcher>, ...Stitcher<GStitcher>[]],
  TDecider extends Stitcher<GStitcher>,
> = GStitcher<
  ThreadsMerged<
    [
      TDecider extends Stitcher<infer G> ? G['threads'] : never,
      ...ThreadsSpread<TOptions>,
    ]
  >,
  ProcedureContextMerged<
    [
      TDecider extends Stitcher<infer G> ? G['context'] : never,
      ...ProcedureContextSpread<TOptions>,
    ]
  > &
    GStitcher['context'],
  TOptions[number] extends Stitcher<infer G> ? G['output'] : never
>;
