/**
 * .what = valid environment values for keyrack keys
 * .why = centralized definition used across CLI and domain operations
 *
 * .note = sudo: elevated credentials (e.g., root-level operations)
 * .note = prod: production environment
 * .note = prep: pre-production environment
 * .note = test: test / development environment
 * .note = all: environment-agnostic (satisfies any specific env via fallback)
 */
export const KEYRACK_VALID_ENVS = [
  'sudo',
  'prod',
  'prep',
  'test',
  'all',
] as const;

/**
 * .what = type for valid keyrack environment values
 * .why = enables type-safe env validation
 */
export type KeyrackEnv = (typeof KEYRACK_VALID_ENVS)[number];

/**
 * .what = check if a string is a valid keyrack env
 * .why = enables runtime validation of env values
 */
export const isValidKeyrackEnv = (env: string): env is KeyrackEnv =>
  KEYRACK_VALID_ENVS.includes(env as KeyrackEnv);
