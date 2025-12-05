import { DomainLiteral } from 'domain-objects';
import type {
  GStitcher,
  Stitcher,
  StitcherBase,
  StitcherForm,
} from './Stitcher';
import type { StitchStep } from './StitchStep';
import type { Thread } from './Thread';
import type { Threads } from './Threads';

/**
 * .what = parallel composite stitcher
 * .how =
 *   - fanout pattern to run substitchers in parallel
 *   - fanin to merge via a conclusion
 * .note = a StitchFanout is a composite Stitcher, similar to StitchRoute, but runs multiple branches in parallel
 */
export interface StitchFanout<
  TStitcher extends GStitcher<Threads<any, 'single'>, any, any>,
> extends StitcherBase<StitcherForm.FANOUT> {
  /**
   * .what = the set of stitchers to run in parallel
   */
  parallels: [
    Stitcher<GStitcher<TStitcher['threads'], TStitcher['context'], any>>,
    ...Stitcher<GStitcher<TStitcher['threads'], TStitcher['context'], any>>[],
  ];

  /**
   * .what = a final stitcher that merges the parallel outputs
   * .why = synthesizes the results into one final output
   * .note = input threads contain arrays per role, due to parallel fanout
   */
  concluder: StitchStep<
    GStitcher<
      ThreadsFromFanout<TStitcher>,
      TStitcher['context'],
      TStitcher['output']
    >
  >;
}
export class StitchFanout<
    TStitcher extends GStitcher<Threads<any, 'single'>, any, any>,
  >
  extends DomainLiteral<StitchFanout<TStitcher>>
  implements StitchFanout<TStitcher> {}

/**
 * .what = transforms threads to an array-of-each-thread for fanouts
 */
export type ThreadsFromFanout<
  T extends GStitcher<Threads<any, 'single'>, any, any>,
> = Threads<
  {
    [K in keyof T['threads'] & string]: T['threads'][K] extends Thread<infer C>
      ? C extends object
        ? C
        : never
      : never;
  },
  'multiple'
>;
