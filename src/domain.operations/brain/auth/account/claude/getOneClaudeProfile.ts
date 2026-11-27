import type { BrainAuthAccount } from '@src/domain.objects/BrainAuthAccount';

import { asClaudeAccountFromProfileReply } from './asClaudeAccountFromProfileReply';
import type { ClaudeReplyStatus } from './asClaudeReplyStatus';
import { CLAUDE_OAUTH } from './claudeOauth';
import { getOneClaudeOauthReply } from './getOneClaudeOauthReply';

/**
 * .what = the account an access token opens, as the provider names it
 * .why = the before and after compare of `use` rests on this read (case=3, case=8)
 * .note = the org id is read when the reply carries one, else null; the profile reply is
 *   unprobed for it (r4), and dev-env-setup never reads one
 */
export const getOneClaudeProfile = async (input: {
  accessToken: string;
}): Promise<
  | { status: 'ok'; account: BrainAuthAccount }
  | { status: Exclude<ClaudeReplyStatus, 'ok'> }
> => {
  // read the profile
  const reply = await getOneClaudeOauthReply({
    call: 'read',
    url: CLAUDE_OAUTH.url.profile,
    accessToken: input.accessToken,
    body: null,
  });
  if (reply.status !== 'ok') return { status: reply.status };

  // cast the account; a reply that drifted reads as unreadable, so the caller degrades that one read
  const account = asClaudeAccountFromProfileReply({ json: reply.json });
  if (!account) return { status: 'unreadable' };
  return { status: 'ok', account };
};
