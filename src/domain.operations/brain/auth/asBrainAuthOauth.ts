import { asJsonParsedOrNull } from '@src/infra/json/asJsonParsedOrNull';

/**
 * .what = the oauth block of a claude login file, or null when it carries none
 * .why = the login readers each need the same narrow: parse the json, reach the
 *   `claudeAiOauth` object, and treat any other shape as "no oauth block". one reader
 *   of the shape keeps the two from drift
 *
 * .note = a file that does not parse reads as null, not as an error; the callers read
 *   an unknown shape as "not a login we can judge", and claude-code judges it itself
 */
export const asBrainAuthOauth = (input: {
  content: string | null;
}): { refreshToken: unknown } | null => {
  if (input.content === null) return null;

  // a file we cannot read as json carries no oauth block we can trust
  const parsed = asJsonParsedOrNull({ content: input.content });
  if (!parsed || typeof parsed !== 'object') return null;

  // reach the oauth object; any other shape carries no login
  const oauth = 'claudeAiOauth' in parsed ? parsed.claudeAiOauth : null;
  if (!oauth || typeof oauth !== 'object') return null;
  return {
    refreshToken: 'refreshToken' in oauth ? oauth.refreshToken : null,
  };
};
