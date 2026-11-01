import { BRAIN_AUTH_ENV_KEYS } from '@src/domain.operations/brain/auth/BRAIN_AUTH_ENV_KEYS';

/**
 * .what = does the spawn env hand claude-code a credential of its own?
 * .why = claude-code prefers an env credential over the login file, so a clone spawned
 *   with one authenticates whatever state `~/.claude/.credentials.json` is in — a dead
 *   login there is no reason to refuse it
 */
export const isBrainAuthViaEnv = (input: { env: NodeJS.ProcessEnv }): boolean =>
  BRAIN_AUTH_ENV_KEYS.some((one) => !!input.env[one.key]);
