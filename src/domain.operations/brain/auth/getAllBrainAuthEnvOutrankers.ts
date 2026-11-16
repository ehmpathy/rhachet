import { BRAIN_AUTH_ENV_KEYS } from './brainAuthEnvKeys';

/**
 * .what = the env credential keys set in this env, each of which outranks the grove login file
 * .why = `use` writes the grove file; a set env credential means every clone that inherits this env
 *   ignores that file, so the swap cannot land (case=8 [t0])
 */
export const getAllBrainAuthEnvOutrankers = (input: {
  env: NodeJS.ProcessEnv;
}): string[] => BRAIN_AUTH_ENV_KEYS.filter((key) => !!input.env[key]);
