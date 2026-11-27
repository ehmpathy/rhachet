import { CLAUDE_AUTH_SLOT } from '@src/domain.operations/brain/auth/account/claude/claudeAuthSlot';
import { getKeyrackKeyGrants } from '@src/domain.operations/keyrack/getKeyrackKeyGrants/getKeyrackKeyGrants';
import { asKeyrackKeyReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReach';

/**
 * .what = the refresh token the keyrack holds for one account, or null when none is cut
 * .why = every read and swap begins with the stored token
 * .note = a locked or blocked slot is not "absent": it returns its status, so the caller names the
 *   unlock a human must run rather than claim the account was never set (case=5)
 */
export const getOneBrainAuthSlotToken = async (input: {
  owner: string | null;
  email: string;
}): Promise<
  | { status: 'granted'; token: string }
  | { status: 'absent' | 'locked' | 'blocked'; fix: string | null }
> => {
  const [attempt] = await getKeyrackKeyGrants({
    for: { keys: [CLAUDE_AUTH_SLOT.key] },
    with: { unlock: true },
    owner: input.owner,
    env: CLAUDE_AUTH_SLOT.env,
    org: CLAUDE_AUTH_SLOT.org,
    reach: asKeyrackKeyReach({ exid: input.email }),
  });
  if (attempt?.status === 'granted')
    return { status: 'granted', token: attempt.grant.key.secret };
  return { status: attempt?.status ?? 'absent', fix: attempt?.fix ?? null };
};
