import { now } from 'iso-time';

import type { ClaudeReplyStatus } from './asClaudeReplyStatus';
import { asClaudeTokenPairFromReply } from './asClaudeTokenPairFromReply';
import { CLAUDE_OAUTH } from './claudeOauth';
import { getOneClaudeOauthReply } from './getOneClaudeOauthReply';

/**
 * .what = a fresh access token, minted from a stored refresh token
 * .why = every read and every swap starts here; the access token opens the profile and usage reads
 * .note = 🔴 the refresh token is single-use: the reply's `refreshToken` replaces the one sent,
 *   and the caller must write it back to the keyrack before aught else (case=9)
 * .note = never call this on the token the grove is signed in with: a mint of the live token
 *   kills that session (measured 2026-07-31)
 */
export const getOneClaudeAccessMinted = async (input: {
  refreshToken: string;
}): Promise<
  | {
      status: 'ok';
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
      scopes: string[];
    }
  | { status: Exclude<ClaudeReplyStatus, 'ok'> }
> => {
  // ask the token endpoint for a fresh pair
  const reply = await getOneClaudeOauthReply({
    call: 'mint',
    url: CLAUDE_OAUTH.url.token,
    accessToken: null,
    body: {
      grant_type: 'refresh_token',
      refresh_token: input.refreshToken,
      client_id: CLAUDE_OAUTH.clientId,
    },
  });
  if (reply.status !== 'ok') return { status: reply.status };

  // cast the pair; a reply that drifted reads as unreadable (its token may be spent, and the hint says so)
  const pair = asClaudeTokenPairFromReply({ json: reply.json, now: now() });
  if (!pair) return { status: 'unreadable' };
  return { status: 'ok', ...pair };
};
