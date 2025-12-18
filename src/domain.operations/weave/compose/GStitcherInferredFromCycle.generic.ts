import type {
  GStitcher,
  GStitcherOf,
  Stitcher,
} from '@src/domain.objects/Stitcher';
import type { Threads } from '@src/domain.objects/Threads';

import type { ProcedureContextMerged } from './ProcedureContextMerged.generic';
import type { ThreadsMerged } from './ThreadsMerged.generic';

/**
 * .what = infers a composite GStitcher from a StitchCycle config
 * .how =
 *   - threads: merged from repeatee + decider
 *   - context: merged from repeatee + decider
 *   - output: same as repeatee (since it loops and returns its output type)
 */
export type GStitcherInferredFromCycle<
  TRepeatee extends Stitcher<GStitcher<Threads<any, 'single'>, any, any>>,
  TDecider extends Stitcher<GStitcher<Threads<any, 'single'>, any, any>>,
> = GStitcher<
  ThreadsMerged<
    [GStitcherOf<TRepeatee>['threads'], GStitcherOf<TDecider>['threads']]
  >,
  ProcedureContextMerged<
    [GStitcherOf<TRepeatee>['context'], GStitcherOf<TDecider>['context']]
  > &
    GStitcher['context'],
  GStitcherOf<TRepeatee>['output']
>;
