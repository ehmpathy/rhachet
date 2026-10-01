import { asBrainAuthOauth } from './asBrainAuthOauth';

/**
 * .what = does a claude login file hold a refresh token, so it can recover itself
 * .why = a login with a refresh token is live whatever its access expiry says — the
 *   next call refreshes it. this is how enroll tells a brain-dir login worth adoption
 *   from a dead or foreign one
 *
 * .note = an absent file, a dead login (empty refresh token), or one that does not
 *   parse reads as false
 * .note = never returns, logs, or compares a token value beyond its emptiness
 */
export const isBrainAuthLive = (input: { content: string | null }): boolean => {
  const oauth = asBrainAuthOauth({ content: input.content });
  return typeof oauth?.refreshToken === 'string' && oauth.refreshToken !== '';
};
