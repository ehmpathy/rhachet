/**
 * .what = the env keys through which claude-code 2.1.280 takes a credential that
 *   outranks the login file
 * .why = each one authenticates a clone on its own, so a clone spawned with any of them
 *   never reads `~/.claude/.credentials.json`; a key set to '' counts as absent, since
 *   claude-code skips an empty value
 */
const BRAIN_AUTH_ENV_KEYS = [
  'CLAUDE_CODE_OAUTH_TOKEN',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
] as const;

/**
 * .what = does the spawn env hand claude-code a credential of its own?
 * .why = claude-code prefers an env credential over the login file, so a clone spawned
 *   with one authenticates whatever state `~/.claude/.credentials.json` is in — a dead
 *   login there is no reason to refuse it
 */
export const isBrainAuthViaEnv = (input: { env: NodeJS.ProcessEnv }): boolean =>
  BRAIN_AUTH_ENV_KEYS.some((key) => !!input.env[key]);
