import { asBrainAuthOauth } from './asBrainAuthOauth';

/**
 * .what = the state of a claude login file, read from its content alone
 * .why = enroll must tell a DEAD login from a live one before it spawns a clone that
 *   would only meet `Login expired`. claude-code's dead-token clear leaves the file in
 *   place with its secrets emptied (`refreshToken: ""`), so presence alone proves naught
 *
 * .note = a file that does not parse, or carries no oauth block, reads as `present`:
 *   enroll only refuses the one shape it can name for certain, and claude-code itself
 *   reports any other fault in the clone
 * .note = never returns, logs, or compares a token value beyond its emptiness
 */
export const asBrainAuthState = (input: {
  content: string | null;
}): 'absent' | 'dead' | 'present' => {
  // no file at all
  if (input.content === null) return 'absent';

  // the dead-token clear empties the refresh token and keeps the rest
  const oauth = asBrainAuthOauth({ content: input.content });
  if (oauth?.refreshToken === '') return 'dead';
  return 'present';
};
