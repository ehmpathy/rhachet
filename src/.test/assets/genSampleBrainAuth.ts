/**
 * .what = the content of a FAKE claude login file (`.credentials.json`)
 * .why = the login checks read this one shape; each test that plants a login builds it
 *   here, so a change to the shape reaches every consumer at once
 *
 * .note = every token is a fake; a test compares a login by its expiry or by the
 *   emptiness of its refresh token, never by a token value
 * .note = `refreshToken: ''` is the shape claude-code's dead-token clear leaves behind
 */
export const genSampleBrainAuth = (input: {
  state: 'live' | 'dead';
  expiresAt: number;
}): string =>
  JSON.stringify({
    claudeAiOauth: {
      accessToken: input.state === 'live' ? 'fake-access' : '',
      refreshToken: input.state === 'live' ? 'fake-refresh' : '',
      expiresAt: input.expiresAt,
      scopes: ['user:inference', 'user:profile'],
    },
  });
