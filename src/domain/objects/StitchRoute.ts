import { DomainLiteral } from 'domain-objects';

import { GStitcher, Stitcher, StitcherBase, StitcherForm } from './Stitcher';

/**
 * .what = a route of stitchers to enstich in sequence; a composed tactic
 * .note = a StitchRoute is really just a composite Stitcher
 *   - e.g., see the generic parameter input
 */
export interface StitchRoute<
  /**
   * .note = a StitchRoute is really just a composite Stitcher
   */
  TStitcher extends GStitcher,
> extends StitcherBase<StitcherForm.ROUTE> {
  /**
   * .what = the route of stitchers to execute in sequence
   */
  sequence: [
    ...Stitcher<
      GStitcher<
        TStitcher['threads'],
        TStitcher['context'],
        any // typecheck the chain of stichers? right now, non-last does not have any requirements
      >
    >[],

    Stitcher<
      GStitcher<
        TStitcher['threads'],
        TStitcher['context'],
        TStitcher['output'] // last stitcher must return the final output of the contract
      >
    >,
  ];
}
export class StitchRoute<TStitcher extends GStitcher>
  extends DomainLiteral<StitchRoute<TStitcher>>
  implements StitchRoute<TStitcher> {}
