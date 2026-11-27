import { DomainLiteral } from 'domain-objects';
import type { IsoTimeStamp } from 'iso-time';

/**
 * .what = one usage window of a brain account: its spent share and when it resets
 * .why = the choice of which account to spend rests on these windows (soonest reset with headroom)
 */
export interface BrainAuthUsageWindow {
  /**
   * .what = which window: the short session window, or the week window
   */
  slug: 'session' | 'week';

  /**
   * .what = the share of the window spent, from 0 to 1
   */
  usedShare: number;

  /**
   * .what = when the window resets
   * .note = null where the provider gave no reset (e.g. a window with no use yet)
   */
  resetsAt: IsoTimeStamp | null;

  /**
   * .what = whether the window is full, so the account is unusable until it resets
   */
  capped: boolean;
}

export class BrainAuthUsageWindow
  extends DomainLiteral<BrainAuthUsageWindow>
  implements BrainAuthUsageWindow {}
