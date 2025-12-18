import type { GStitcher, Stitcher } from '@src/domain.objects/Stitcher';
import type { Threads } from '@src/domain.objects/Threads';

import type { ProcedureContextMerged } from './ProcedureContextMerged.generic';
import type { ThreadsMerged } from './ThreadsMerged.generic';

type Last<T extends readonly any[]> = T extends readonly [...any[], infer L]
  ? L
  : never;

/**
 * .what = a mech to infer a GStitcher from a StitchRoute.Sequence
 *   - i.e., infers the composite stitcher
 * .how =
 *   - merges the required threads into a superset
 *   - merges the required procedure.context into a superset
 *   - picks the last output as the overall output
 * .note =
 *   - requires an [...stitchers,] as const input, to ensure type propagation safely (fails fast to prevent type info loss)
 */
export type GStitcherInferredFromRoute<
  TSequence extends readonly [
    // note: we only need to support single threaded here
    Stitcher<GStitcher<Threads<any, 'single'>, any, any>>,
    ...Stitcher<GStitcher<Threads<any, 'single'>, any, any>>[],
  ],
> = GStitcher<
  ThreadsMerged<{
    [K in keyof TSequence]: TSequence[K] extends Stitcher<infer G>
      ? G['threads']
      : never;
  }>,
  ProcedureContextMerged<{
    [K in keyof TSequence]: TSequence[K] extends Stitcher<infer G>
      ? G['context']
      : never;
  }> &
    GStitcher['context'],
  Last<TSequence> extends Stitcher<infer G> ? G['output'] : never
>;
