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
   * .what = a human readable unique key, within the registered namespace
   */
  slug: string;

  /**
   * .what = a human readable name
   * .why = display a grokable name for the route
   */
  name: string;

  /**
   * .what = a grokable description of the route; e.g., the readme
   */
  description: string | null;

  /**
   * .what = the route of stitchers to execute in sequence
   */
  sequence: [
    ...Stitcher<
      GStitcher<
        TStitcher['threads'],
        TStitcher['procedure']['context'],
        any // typecheck the chain of stichers? right now, non-last does not have any requirements
      >
    >[],

    Stitcher<
      GStitcher<
        TStitcher['threads'],
        TStitcher['procedure']['context'],
        TStitcher['output'] // last stitcher must return the final output of the contract
      >
    >,
  ];
}
export class StitchRoute<TStitcher extends GStitcher>
  extends DomainLiteral<StitchRoute<TStitcher>>
  implements StitchRoute<TStitcher> {}
