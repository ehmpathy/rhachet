import {
  GStitcher,
  GStitcherOf,
  Stitcher,
} from '../../../domain/objects/Stitcher';
import { Threads } from '../../../domain/objects/Threads';
import { ProcedureContextMerged } from './ProcedureContextMerged.generic';
import { ThreadsMerged } from './ThreadsMerged.generic';

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
