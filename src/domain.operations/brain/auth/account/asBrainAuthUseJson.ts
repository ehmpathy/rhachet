import type { BrainAuthAccount } from '@src/domain.objects/BrainAuthAccount';
import type { BrainAuthUsageWindow } from '@src/domain.objects/BrainAuthUsageWindow';

/**
 * .what = the json envelope of `rhx brains auth use --output json`
 * .why = the pool rotation (#575) parses this shape, so it is named and snapped in one place
 * .note = live clones are named only for a swap: an `unchanged` use moved no login, so none is at
 *   risk (case=10 [t2])
 * .note = `windowsCapped` is null where the usage was unread, and on `unchanged`, where none was read
 */
export const asBrainAuthUseJson = (input: {
  outcome: 'swapped' | 'unchanged';
  before: BrainAuthAccount | null;
  after: BrainAuthAccount;
  stowed: string | null;
  windowsCapped: BrainAuthUsageWindow[] | null;
  owner: string;
  clonesLive: string[];
}): {
  scope: 'grove';
  owner: string;
  outcome: 'swapped' | 'unchanged';
  before: BrainAuthAccount | null;
  after: BrainAuthAccount;
  landed: true;
  stowed: string | null;
  windowsCapped: BrainAuthUsageWindow[] | null;
  clonesLive: string[];
} => ({
  scope: 'grove',
  owner: input.owner,
  outcome: input.outcome,
  before: input.before,
  after: input.after,
  landed: true,
  stowed: input.stowed,
  windowsCapped: input.windowsCapped,
  clonesLive: input.outcome === 'swapped' ? input.clonesLive : [],
});
