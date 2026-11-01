/**
 * .what = what an env credential bills: the vendor api, or the subscription
 */
export type BrainAuthBills = 'api' | 'subscription';

/**
 * .what = the env keys through which claude-code 2.1.280 takes a credential that
 *   outranks the login file, each with what it bills
 * .why = each one authenticates a clone on its own, so a clone spawned with any of them
 *   never reads `~/.claude/.credentials.json`; a key set to '' counts as absent, since
 *   claude-code skips an empty value. one table, so the login-hint holdback and the
 *   api-billed notice read the same keys and cannot drift
 */
export const BRAIN_AUTH_ENV_KEYS: readonly {
  key: string;
  bills: BrainAuthBills;
}[] = [
  { key: 'CLAUDE_CODE_OAUTH_TOKEN', bills: 'subscription' },
  { key: 'ANTHROPIC_API_KEY', bills: 'api' },
  { key: 'ANTHROPIC_AUTH_TOKEN', bills: 'api' },
];
