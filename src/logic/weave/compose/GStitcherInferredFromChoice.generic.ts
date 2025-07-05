import { GStitcher, Stitcher } from '../../../domain/objects/Stitcher';
import { ProcedureContextMerged } from './ProcedureContextMerged.generic';
import { ThreadsMerged } from './ThreadsMerged.generic';

type MapToThreadsTuple<
  T extends readonly [Stitcher<GStitcher>, ...Stitcher<GStitcher>[]],
> = T extends readonly [
  infer A extends Stitcher<GStitcher>,
  ...infer R extends Stitcher<GStitcher>[],
]
  ? [
      A extends Stitcher<infer GA> ? GA['threads'] : never,
      ...{
        [K in keyof R]: R[K] extends Stitcher<infer GR> ? GR['threads'] : never;
      },
    ]
  : never;

type MapToContextTuple<
  T extends readonly [Stitcher<GStitcher>, ...Stitcher<GStitcher>[]],
> = T extends readonly [
  infer A extends Stitcher<GStitcher>,
  ...infer R extends Stitcher<GStitcher>[],
]
  ? [
      A extends Stitcher<infer GA> ? GA['context'] : never,
      ...{
        [K in keyof R]: R[K] extends Stitcher<infer GR> ? GR['context'] : never;
      },
    ]
  : never;

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
      ...MapToThreadsTuple<TOptions>,
    ]
  >,
  ProcedureContextMerged<
    [
      TDecider extends Stitcher<infer G> ? G['context'] : never,
      ...MapToContextTuple<TOptions>,
    ]
  > &
    GStitcher['context'],
  TOptions[number] extends Stitcher<infer G> ? G['output'] : never
>;
