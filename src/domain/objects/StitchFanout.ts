import { DomainLiteral } from 'domain-objects';

import { GStitcher, Stitcher, StitcherBase, StitcherForm } from './Stitcher';

/**
 * .what = parallel composite stitcher
 * .how =
 *   - fanout pattern to run substitchers in parallel
 *   - fanin to merge via a conclusion
 * .note = a StitchFanout is a composite Stitcher, similar to StitchRoute, but runs multiple branches in parallel
 */
export interface StitchFanout<
  /**
   * .note = the fanout as a whole produces a single unified output
   */
  TStitcher extends GStitcher,
> extends StitcherBase<StitcherForm.FANOUT> {
  /**
   * .what = a human readable unique key, within the registered namespace
   */
  slug: string;

  /**
   * .what = a human readable name
   * .why = used to display a clear name for the fanout group
   */
  name: string;

  /**
   * .what = description of the fanout purpose; used like a readme
   */
  description: string | null;

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
   */
  conclusion: Stitcher<
    GStitcher<TStitcher['threads'], TStitcher['context'], TStitcher['output']>
  >;
}

export class StitchFanout<TStitcher extends GStitcher>
  extends DomainLiteral<StitchFanout<TStitcher>>
  implements StitchFanout<TStitcher> {}
