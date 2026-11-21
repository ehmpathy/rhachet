import type { BrainAuthAccount } from '@src/domain.objects/BrainAuthAccount';
import { BrainAuthUsage } from '@src/domain.objects/BrainAuthUsage';

/**
 * .what = a usage row for an account whose windows were not read
 * .why = a row still renders when its read stops short, so one account's fault never hides the
 *   others (case=5 [t2]); one constructor keeps every such row the same shape
 */
export const asBrainAuthUsageUnread = (input: {
  email: string;
  account: BrainAuthAccount | null;
  status: Exclude<BrainAuthUsage['status'], 'read'>;
  signedIn: boolean;
  renewed: boolean;
}): BrainAuthUsage =>
  new BrainAuthUsage({
    email: input.email,
    account: input.account,
    status: input.status,
    windows: [],
    savedResets: null,
    signedIn: input.signedIn,
    renewed: input.renewed,
  });
