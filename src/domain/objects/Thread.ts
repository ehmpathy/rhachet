import { DomainLiteral } from 'domain-objects';
import { omit } from 'type-fns';

import { Stitch } from './Stitch';
import { StitchSetEvent } from './StitchSetEvent';

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

  /**
   * .what = the history that produced the state of this thread
   * .note =
   *   - history should only be used for observability
   *   - should expect it to be optional, (e.g., only in prep environments, rarely in prod)
   *      - due to the size (lots of repeated data)
   *      - due to alt prod observability tools
   */
  history?: StitchSetEvent<any, any>[];
}
export class Thread<TThreadContext>
  extends DomainLiteral<Thread<TThreadContext>>
  implements Thread<TThreadContext> {}

export type ThreadOmitHistory<TThread extends Thread<any>> = Omit<
  TThread,
  'history'
>;
export const threadOmitHistory = <TThread extends Thread<any>>(
  thread: TThread,
): ThreadOmitHistory<TThread> => omit(thread, ['history']);
