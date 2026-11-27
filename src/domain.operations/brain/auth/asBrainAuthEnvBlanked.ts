import { BRAIN_AUTH_ENV_KEYS } from './brainAuthEnvKeys';

/**
 * .what = an env patch that sets each brain credential key to the empty string
 * .why = a set env credential outranks the login file, so a login spawned under it would leave no
 *   login file behind; claude-code skips an empty value, so a blank key is as good as absent
 */
export const asBrainAuthEnvBlanked = (): Record<string, string> =>
  Object.fromEntries(BRAIN_AUTH_ENV_KEYS.map((key) => [key, '']));
