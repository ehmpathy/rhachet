import {
  addDuration,
  asIsoTimeStamp,
  type IsoDuration,
  type IsoTimeStamp,
} from 'iso-time';

/**
 * .what = the slack before expiry within which a token already reads lapsed
 * .why = a token one second from expiry lapses mid-request; a host clock that runs slow would
 *   also judge a spent token live. a minute covers both
 */
const CLAUDE_OAUTH_LAPSE_MARGIN: IsoDuration = { minutes: 1 };

/**
 * .what = has a claude access token passed its expiry, or come within a minute of it?
 * .why = a lapsed grove token must not be used, nor refreshed (case=9): both `get` and `use` judge
 *   it before any provider call
 * .note = claude's login file stores `expiresAt` as epoch milliseconds; this is the one boundary
 *   that casts it, so the rest of the code compares iso stamps. an absent expiry is not lapsed
 */
export const isClaudeOauthLapsed = (input: {
  expiresAt: number | null;
  now: IsoTimeStamp;
}): boolean => {
  if (input.expiresAt === null) return false;
  const nowWithMargin = addDuration(input.now, CLAUDE_OAUTH_LAPSE_MARGIN);
  return asIsoTimeStamp(new Date(input.expiresAt)) <= nowWithMargin; // utc iso stamps sort as text
};
