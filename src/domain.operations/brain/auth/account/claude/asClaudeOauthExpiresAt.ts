import { addDuration, type IsoTimeStamp } from 'iso-time';

/**
 * .what = the instant a minted access token lapses, as epoch milliseconds
 * .why = claude's login file stores `expiresAt` in epoch milliseconds, while the token reply gives a
 *   lifetime in seconds from now
 * .note = the one place this repo leaves iso-time for a raw epoch: the format is claude's, not ours
 */
export const asClaudeOauthExpiresAt = (input: {
  ttlSeconds: number;
  now: IsoTimeStamp;
}): number =>
  new Date(addDuration(input.now, { seconds: input.ttlSeconds })).getTime();
