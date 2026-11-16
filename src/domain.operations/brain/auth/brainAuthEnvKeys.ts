/**
 * .what = the env keys through which claude-code 2.1.280 takes a credential that
 *   outranks the login file
 * .why = each one authenticates a clone on its own, so a clone spawned with any of them
 *   never reads `~/.claude/.credentials.json`; a key set to '' counts as absent, since
 *   claude-code skips an empty value
 * .note = the one list the env predicate, the outranker read and the blank env all read
 */
export const BRAIN_AUTH_ENV_KEYS = [
  'CLAUDE_CODE_OAUTH_TOKEN',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
] as const;
