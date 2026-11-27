import { asIsoTimeStamp } from 'iso-time';

import { BrainAuthUsageWindow } from '@src/domain.objects/BrainAuthUsageWindow';

/**
 * .what = one usage window of an account: session or week, its used share and reset
 * .why = the render suites build windows of this shape (rule.require.shared-test-fixtures)
 * .note = `capped` defaults to whether the share is full; `resetsAt` null means no reset is named
 */
export const genSampleBrainAuthUsageWindow = (input: {
  slug: BrainAuthUsageWindow['slug'];
  usedShare: number;
  resetsAt: string | null;
  capped?: boolean;
}): BrainAuthUsageWindow =>
  new BrainAuthUsageWindow({
    slug: input.slug,
    usedShare: input.usedShare,
    resetsAt: input.resetsAt === null ? null : asIsoTimeStamp(input.resetsAt),
    capped: input.capped ?? input.usedShare >= 1,
  });
