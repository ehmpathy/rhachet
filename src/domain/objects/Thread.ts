import { DomainLiteral } from 'domain-objects';

import { Stitch } from './Stitch';

/**
 * .what = a declaration of a thought thread
 */
export interface Thread<TThreadContext> {
  /**
   * the context accumulated for this thread so far
   */
  context: TThreadContext;

  /**
   * .what = the stitches that were executed with this thread so far
   */
  stitches: Stitch<any>[];
}

export class Thread<TThreadContext>
  extends DomainLiteral<Thread<TThreadContext>>
  implements Thread<TThreadContext> {}
