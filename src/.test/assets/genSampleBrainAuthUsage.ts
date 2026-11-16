import { BrainAuthUsage } from '@src/domain.objects/BrainAuthUsage';
import type { BrainAuthUsageWindow } from '@src/domain.objects/BrainAuthUsageWindow';

import { genSampleBrainAuthAccount } from './genSampleBrainAuthAccount';

/**
 * .what = one usage row of `brains auth get`, read or not
 * .why = the render, the exit judge, and the orchestrator suites all build rows of this shape
 *   (rule.require.shared-test-fixtures)
 * .note = a row with status `read` names its account; any other status names none, as the
 *   provider named none
 */
export const genSampleBrainAuthUsage = (input: {
  email: string;
  status: BrainAuthUsage['status'];
  windows?: BrainAuthUsageWindow[];
  savedResets?: number | null;
  signedIn?: boolean;
  renewed?: boolean;
}): BrainAuthUsage =>
  new BrainAuthUsage({
    email: input.email,
    account:
      input.status === 'read'
        ? genSampleBrainAuthAccount({ email: input.email })
        : null,
    status: input.status,
    windows: input.windows ?? [],
    savedResets: input.savedResets ?? null,
    signedIn: input.signedIn ?? false,
    renewed: input.renewed ?? false,
  });
