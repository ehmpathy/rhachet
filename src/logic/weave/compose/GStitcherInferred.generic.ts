import { GStitcher, Stitcher } from '../../../domain/objects/Stitcher';
import { ProcedureContextMerged } from './ProcedureContextMerged.generic';
import { ThreadsMerged } from './ThreadsMerged.generic';

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
export type GStitcherInferred<
  TSequence extends readonly [Stitcher<GStitcher>, ...Stitcher<GStitcher>[]], // requires a readonly tuple for type safety
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
