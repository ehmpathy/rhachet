import type { ClaudeReplyStatus } from './asClaudeReplyStatus';
import { asClaudeUsageReplyDrift } from './asClaudeUsageReplyDrift';
import { CLAUDE_OAUTH } from './claudeOauth';
import { getOneClaudeOauthReply } from './getOneClaudeOauthReply';

/**
 * .what = the raw usage reply an access token opens, checked for drift
 * .why = `get` casts it via `asBrainAuthUsageFromClaudeReply`; the cast stays pure and unit-tested,
 *   this read stays thin
 * .note = a reply that drifted reads as unreadable here, once, so every caller degrades that one
 *   read and the cast only ever sees a shape it reads
 */
export const getOneClaudeUsageReply = async (input: {
  accessToken: string;
}): Promise<
  | { status: 'ok'; reply: unknown }
  | { status: Exclude<ClaudeReplyStatus, 'ok'> }
> => {
  const reply = await getOneClaudeOauthReply({
    call: 'read',
    url: CLAUDE_OAUTH.url.usage,
    accessToken: input.accessToken,
    body: null,
  });
  if (reply.status !== 'ok') return { status: reply.status };
  if (asClaudeUsageReplyDrift({ reply: reply.json }))
    return { status: 'unreadable' };
  return { status: 'ok', reply: reply.json };
};
