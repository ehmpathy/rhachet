import { MalfunctionError } from 'helpful-errors';
import { asIsoTimeStamp } from 'iso-time';

import type { BrainAuthAccount } from '@src/domain.objects/BrainAuthAccount';
import { BrainAuthUsage } from '@src/domain.objects/BrainAuthUsage';
import { BrainAuthUsageWindow } from '@src/domain.objects/BrainAuthUsageWindow';
import {
  asClaudeUsageReplyDrift,
  CLAUDE_USAGE_WINDOW_FIELDS,
} from '@src/domain.operations/brain/auth/account/claude/asClaudeUsageReplyDrift';

/**
 * .what = the next move a usage reply drift names
 * .why = a drift is no caller fault, and no retry cures it; the fix is a defect report
 */
const CLAUDE_USAGE_DRIFT_HINT =
  "the provider's usage reply shape drifted; file a defect at ehmpathy/rhachet with these keys";

/**
 * .what = cast a claude `/api/oauth/usage` reply into a BrainAuthUsage
 * .why = isolates the provider's shape, so the rest of rhachet reads only domain objects
 * .note
 *   - a window present as `null` means the plan has no such limit, and is omitted
 *   - a reply that drifted (`asClaudeUsageReplyDrift`) fails loud; a caller that must not halt on
 *     drift checks that detector first
 *   - saved resets are counted only when the endpoint saw the claude cli (no `ineligible_reason`)
 */
export const asBrainAuthUsageFromClaudeReply = (input: {
  reply: unknown;
  account: BrainAuthAccount;
  signedIn: boolean;
  renewed: boolean;
}): BrainAuthUsage => {
  // reject a reply that drifted from the shape we read
  const drift = asClaudeUsageReplyDrift({ reply: input.reply });
  if (drift)
    throw new MalfunctionError(drift.reason, {
      keys: drift.keys,
      hint: CLAUDE_USAGE_DRIFT_HINT,
    });
  const record = input.reply as Record<string, unknown>; // external json, shape checked by the drift detector

  // cast each window the reply holds
  const windows = CLAUDE_USAGE_WINDOW_FIELDS.flatMap(({ field, slug }) => {
    const window = record[field];
    if (window === null) return [];
    return [asBrainAuthUsageWindowFromClaudeWindow({ window, slug })];
  });

  // count the saved resets the plan holds
  const savedResets = asSavedResetsFromClaudeReply({ record });

  return new BrainAuthUsage({
    email: input.account.email,
    account: input.account,
    status: 'read',
    windows,
    savedResets,
    signedIn: input.signedIn,
    renewed: input.renewed,
  });
};

/**
 * .what = cast one claude window `{ utilization, resets_at }` into a BrainAuthUsageWindow
 * .why = utilization is a percent; the domain holds a share from 0 to 1
 * .note = called only after the drift detector passed, so utilization is a number
 */
const asBrainAuthUsageWindowFromClaudeWindow = (input: {
  window: unknown;
  slug: BrainAuthUsageWindow['slug'];
}): BrainAuthUsageWindow => {
  const window = input.window as Record<string, unknown>; // external json, checked by the drift detector
  const utilization = window.utilization as number; // a number, per the drift detector

  // cast the reset, if the window has opened
  const resetsAtRaw = window.resets_at;
  const resetsAt =
    typeof resetsAtRaw === 'string' && resetsAtRaw.length > 0
      ? asIsoTimeStamp(new Date(resetsAtRaw))
      : null;

  return new BrainAuthUsageWindow({
    slug: input.slug,
    usedShare: utilization / 100,
    resetsAt,
    capped: utilization >= 100,
  });
};

/**
 * .what = count the reset grants the plan has banked and left to use
 * .why = "saved resets" in `brains auth get` means these grants (fulcrum F4)
 * .note = null when the reply carries no grant data, or the endpoint did not see the claude cli
 */
const asSavedResetsFromClaudeReply = (input: {
  record: Record<string, unknown>;
}): number | null => {
  // skip when the reply holds no grant data
  const cedarEmber = input.record.cedar_ember as
    | { grants?: unknown; ineligible_reason?: unknown }
    | null
    | undefined; // external json, narrowed by the checks below
  if (!cedarEmber || typeof cedarEmber !== 'object') return null;
  if (cedarEmber.ineligible_reason) return null;
  if (!Array.isArray(cedarEmber.grants)) return null;

  // sum the resets left across grants
  return cedarEmber.grants.reduce<number>((sum, grant) => {
    const resetsLeft = (grant as { resets_left?: unknown } | null)?.resets_left; // external json, typeof-checked next
    return typeof resetsLeft === 'number' && resetsLeft > 0
      ? sum + resetsLeft
      : sum;
  }, 0);
};
