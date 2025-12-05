import type { UniDuration } from '@ehmpathy/uni-time';
import { DomainLiteral } from 'domain-objects';
import type { PickAny } from 'type-fns';

import type {
  GStitcher,
  Stitcher,
  StitcherBase,
  StitcherForm,
} from './Stitcher';
import type { Threads } from './Threads';

/**
 * .what = repeater composite stitcher
 * .how =
 *   - declare the repeatee, which will be repeated while decider chooses 'repeat'
 *   - declare the decider, which selects 'repeat', 'release', or 'halt'
 * .note =
 *   - by default, will halt if 100cycles or 1hrs have been reached
 *   - fails fast; you can always resume a weave from the event stream after fix of error
 */
export interface StitchCycle<
  TStitcher extends GStitcher<Threads<any, 'single'>, any, any>,
> extends StitcherBase<StitcherForm.CYCLE> {
  /**
   * .what = the stitcher to repeat
   */
  repeatee: Stitcher<
    GStitcher<TStitcher['threads'], TStitcher['context'], any>
  >;

  /**
   * .what = the stitcher which decides whether to repeat, release, or halt
   * .output = { choice: 'repeat' | 'release' | 'halt' }
   */
  decider: Stitcher<
    GStitcher<
      TStitcher['threads'],
      TStitcher['context'],
      { choice: 'repeat' | 'release' | 'halt' }
    >
  >;

  /**
   * .what = the configuration of when to halt the cycler, to prevent infiloop
   */
  halter: {
    threshold: PickAny<{
      /**
       * the number of repetitions of the cycle
       */
      repetitions: number;

      /**
       * the amount of time spent in the cycle
       */
      duration: UniDuration;
    }>;
  };
}

export class StitchCycle<
    TStitcher extends GStitcher<Threads<any, 'single'>, any, any>,
  >
  extends DomainLiteral<StitchCycle<TStitcher>>
  implements StitchCycle<TStitcher> {}
