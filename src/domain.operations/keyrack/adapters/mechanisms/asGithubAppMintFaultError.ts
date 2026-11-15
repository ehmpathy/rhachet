import { ConstraintError } from 'helpful-errors';

/**
 * .what = the closed set of mint faults a stored github-app blob can cause
 */
export const GITHUB_APP_MINT_FAULTS = [
  'key-refused',
  'installation-refused',
  'key-invalid',
] as const;
export type GithubAppMintFault = (typeof GITHUB_APP_MINT_FAULTS)[number];

/**
 * .what = the error as a github-app mint refusal (`asGithubAppMintFaultRefusal`), or null
 * .why = the vault that holds the blob appends its cure to these refusals and to no other error;
 *        a check over the closed fault set keeps an unrelated ConstraintError that happens to
 *        carry a `fault` string from a cure it was never meant to get
 *
 * .note = a cast, not a subclass: the refusal stays a ConstraintError by name, so its header
 *         reads `ConstraintError:` as every caller-fixable error does
 */
export const asGithubAppMintFaultError = (input: {
  error: unknown;
}): ConstraintError<{ fault: GithubAppMintFault; hint?: unknown }> | null => {
  if (!(input.error instanceof ConstraintError)) return null;
  const fault: unknown = input.error.metadata?.fault;
  const faultKnown = GITHUB_APP_MINT_FAULTS.find((known) => known === fault);
  if (!faultKnown) return null;
  return input.error;
};
