import { DomainLiteral } from 'domain-objects';

import { GStitcher, Stitcher, StitcherBase, StitcherForm } from './Stitcher';
import { Threads } from './Threads';

/**
 * .what = fork+choose composite stitcher
 * .how =
 *   - declare the stitcher options to choose from
 *   - declare a stitcher to choose one
 * .note =
 *   - choose multiple can be composed via choice of a fanout route
 */
export interface StitchChoice<
  TStitcher extends GStitcher<Threads<any, 'single'>, any, any>,
> extends StitcherBase<StitcherForm.CHOICE> {
  /**
   * .what = the stitcher which decides the choice
   */
  decider: Stitcher<
    GStitcher<
      TStitcher['threads'],
      TStitcher['context'],
      { choice: { slug: string } } // todo: can we constrain the slug options to the inputs from options?
    >
  >;

  /**
   * .what = the set of stitchers to choose one from
   */
  options: [
    Stitcher<GStitcher<TStitcher['threads'], TStitcher['context'], any>>,
    ...Stitcher<GStitcher<TStitcher['threads'], TStitcher['context'], any>>[],
  ];
}
export class StitchChoice<
    TStitcher extends GStitcher<Threads<any, 'single'>, any, any>,
  >
  extends DomainLiteral<StitchChoice<TStitcher>>
  implements StitchChoice<TStitcher> {}
