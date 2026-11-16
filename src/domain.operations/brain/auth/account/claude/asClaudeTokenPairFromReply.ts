import type { IsoTimeStamp } from 'iso-time';

import { asClaudeOauthExpiresAt } from './asClaudeOauthExpiresAt';
import { asClaudeOauthScopes } from './asClaudeOauthScopes';
import { CLAUDE_OAUTH } from './claudeOauth';

/**
 * .what = the token pair a claude token reply carries, or null when the reply drifted
 * .why = the mint and the cast are two jobs; the cast is pure, so it is tested apart from the wire
 * .note = a reply that lacks either token is drift. null lets the wire reader report it as
 *   `unreadable`, whose hint names the risk: the endpoint may have spent the login it was sent
 * .note = never returns or logs aught but the pair it read
 */
export const asClaudeTokenPairFromReply = (input: {
  json: unknown;
  now: IsoTimeStamp;
}): {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
} | null => {
  // external json: each field is narrowed below, a null body reads as drift
  const json = (input.json ?? {}) as {
    access_token?: unknown;
    refresh_token?: unknown;
    expires_in?: unknown;
    scope?: unknown;
  };

  // a reply that lacks either token is drift
  if (
    typeof json.access_token !== 'string' ||
    typeof json.refresh_token !== 'string'
  )
    return null;

  // the pair, with its expiry and scopes
  const ttlSeconds =
    typeof json.expires_in === 'number'
      ? json.expires_in
      : CLAUDE_OAUTH.accessTtlSecondsDefault;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: asClaudeOauthExpiresAt({ ttlSeconds, now: input.now }),
    scopes: asClaudeOauthScopes({ scope: json.scope }),
  };
};
