import { BrainAuthUsage } from '@src/domain.objects/BrainAuthUsage';
import { asBrainAuthUsageUnread } from '@src/domain.operations/brain/auth/account/asBrainAuthUsageUnread';
import { asBrainAuthUsageFromClaudeReply } from '@src/domain.operations/brain/auth/account/claude/asBrainAuthUsageFromClaudeReply';
import {
  type ContextBrainAuthAccount,
  genContextBrainAuthAccount,
} from '@src/domain.operations/brain/auth/account/genContextBrainAuthAccount';
import { setBrainAuthSlotTokenRotated } from '@src/domain.operations/brain/auth/account/slot/setBrainAuthSlotTokenRotated';

/**
 * .what = the usage of one stored account, read through a fresh mint of its parked token
 * .why = `get` shows every account the keyrack holds (case=2)
 * .note = 🔴 this read writes: the mint spends the parked token, so `setBrainAuthSlotTokenRotated`
 *   parks its successor back FIRST, before the profile or usage read (case=9). `get` names that
 *   write on each row it rotated (`renewed`)
 * .note = never call this for the signed-in account: its keyrack copy was spent by the swap that
 *   installed it, and its live token is the grove's alone
 * .note = a locked keyrack yields a `locked` row, so the rest of the table still renders; a token
 *   the keyrack no longer holds reads as dead
 * .note = a row is `renewed` once its mint landed, whatever the profile or usage read did after:
 *   the mint is the write
 */
export const getOneBrainAuthUsageOfSlot = async (
  input: {
    owner: string | null;
    email: string;
  },
  context: Pick<ContextBrainAuthAccount, 'getProfile' | 'getUsageReply'> &
    Parameters<
      typeof setBrainAuthSlotTokenRotated
    >[1] = genContextBrainAuthAccount(),
): Promise<BrainAuthUsage> => {
  // mint from the parked token; the rotated one is parked back first, past any racer
  const minted = await setBrainAuthSlotTokenRotated(input, context);
  if (minted.status === 'absent')
    return asBrainAuthUsageUnread({
      email: input.email,
      account: null,
      status: 'dead',
      signedIn: false,
      renewed: false,
    });
  if (minted.status === 'blocked')
    return asBrainAuthUsageUnread({
      email: input.email,
      account: null,
      status: 'locked',
      signedIn: false,
      renewed: false,
    });
  if (minted.status !== 'ok')
    return asBrainAuthUsageUnread({
      email: input.email,
      account: null,
      status: minted.status,
      signedIn: false,
      renewed: false,
    });

  // name the account, then read its usage; the login is renewed from here on
  const profile = await context.getProfile({
    accessToken: minted.accessToken,
  });
  if (profile.status !== 'ok')
    return asBrainAuthUsageUnread({
      email: input.email,
      account: null,
      status: profile.status,
      signedIn: false,
      renewed: true,
    });
  const usage = await context.getUsageReply({
    accessToken: minted.accessToken,
  });
  if (usage.status !== 'ok')
    return asBrainAuthUsageUnread({
      email: input.email,
      account: profile.account,
      status: usage.status,
      signedIn: false,
      renewed: true,
    });
  return new BrainAuthUsage({
    ...asBrainAuthUsageFromClaudeReply({
      reply: usage.reply,
      account: profile.account,
      signedIn: false,
      renewed: true,
    }),
    email: input.email,
  });
};
