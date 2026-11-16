import { now } from 'iso-time';

import type { BrainAuthUsage } from '@src/domain.objects/BrainAuthUsage';
import { asBrainAuthUsageUnread } from '@src/domain.operations/brain/auth/account/asBrainAuthUsageUnread';
import { asBrainAuthUsageFromClaudeReply } from '@src/domain.operations/brain/auth/account/claude/asBrainAuthUsageFromClaudeReply';
import { getOneClaudeGroveOauth } from '@src/domain.operations/brain/auth/account/claude/getOneClaudeGroveOauth';
import { getOneClaudeJsonAccountClaimed } from '@src/domain.operations/brain/auth/account/claude/getOneClaudeJsonAccountClaimed';
import { isClaudeOauthLapsed } from '@src/domain.operations/brain/auth/account/claude/isClaudeOauthLapsed';
import {
  type ContextBrainAuthAccount,
  genContextBrainAuthAccount,
} from '@src/domain.operations/brain/auth/account/genContextBrainAuthAccount';
import { getBrainAuthPath } from '@src/domain.operations/brain/auth/getBrainAuthPath';

/**
 * .what = the usage of the account the grove is signed in on, or null when it is signed in on none
 * .why = `get` shows the live account beside the stored ones, marked signed in (case=2)
 * .note = 🔴 reads with the live ACCESS token only, and never refreshes it: a refresh of the live
 *   token kills the session it serves (case=9). a lapsed token yields `unverified`, named from
 *   `~/.claude.json` (case=5 [t3])
 */
export const getOneBrainAuthUsageOfGrove = async (
  input: {
    home: string;
  },
  context: Pick<
    ContextBrainAuthAccount,
    'getProfile' | 'getUsageReply'
  > = genContextBrainAuthAccount(),
): Promise<BrainAuthUsage | null> => {
  // read the grove's login; no usable block means no signed-in account
  const oauth = getOneClaudeGroveOauth({
    path: getBrainAuthPath({ home: input.home }),
  });
  if (!oauth) return null;

  // a lapsed access token is not refreshed here; name the account from the cli's own record
  if (isClaudeOauthLapsed({ expiresAt: oauth.expiresAt, now: now() }))
    return asUsageUnverified({ home: input.home });

  // name the account with the live token
  const profile = await context.getProfile({
    accessToken: oauth.accessToken,
  });
  if (profile.status !== 'ok') {
    const unverified = asUsageUnverified({ home: input.home });
    if (!unverified) return null;
    return asBrainAuthUsageUnread({ ...unverified, status: profile.status });
  }

  // read its usage with the same token
  const usage = await context.getUsageReply({
    accessToken: oauth.accessToken,
  });
  if (usage.status !== 'ok')
    return asBrainAuthUsageUnread({
      email: profile.account.email,
      account: profile.account,
      status: usage.status,
      signedIn: true,
      renewed: false,
    });
  return asBrainAuthUsageFromClaudeReply({
    reply: usage.reply,
    account: profile.account,
    signedIn: true,
    renewed: false,
  });
};

/**
 * .what = the signed-in row, named from `~/.claude.json` with no provider read
 * .why = the fallback when the live token may not be used; null when the cli kept no record
 */
const asUsageUnverified = (input: { home: string }): BrainAuthUsage | null => {
  const claimed = getOneClaudeJsonAccountClaimed({ home: input.home });
  if (!claimed) return null;
  return asBrainAuthUsageUnread({
    email: claimed.email,
    account: null,
    status: 'unverified',
    signedIn: true,
    renewed: false,
  });
};
