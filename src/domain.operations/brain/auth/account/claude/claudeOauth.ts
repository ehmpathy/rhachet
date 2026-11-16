/**
 * .what = the claude oauth contract rhachet speaks: endpoints, client id, the pinned user agent
 * .why = one home for the provider's constants, so a drift is fixed in one place
 * .note = the token endpoint rejects a client it does not know, so the user agent matters: it
 *   pins the claude-code version measured against (dev-env-setup `brains.auth.usage`), and
 *   drifts with it
 * .note = a refresh token is single-use; each mint returns its successor, which must be written
 *   back before aught else (case=9)
 */
export const CLAUDE_OAUTH = {
  clientId: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
  userAgent: 'claude-cli/2.1.280 (external, cli)',
  betaHeader: 'oauth-2025-04-20',
  url: {
    token: 'https://platform.claude.com/v1/oauth/token',
    profile: 'https://api.anthropic.com/api/oauth/profile',
    usage: 'https://api.anthropic.com/api/oauth/usage?cedar_ember=1&at_wall=1',
  },
  timeoutMs: 15_000,
  accessTtlSecondsDefault: 3600,
} as const;
