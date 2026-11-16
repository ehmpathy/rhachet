import { ConstraintError } from 'helpful-errors';

import { asErrorBareMessage } from '@src/infra/asErrorBareMessage';

import { asGithubAppMintFaultError } from './asGithubAppMintFaultError';

/**
 * .what = a github-app mint refusal, with the cure the vault that holds the blob names
 * .why = the mech is shared by every vault that holds a github-app blob, so it states only the
 *        fault; the re-file command differs by vault (a pipe into os.secure, a guided set into
 *        aws.params), and an ec2 grove told to re-file into os.secure would move its key's home
 *
 * .note = any error that is not a mint refusal (`asGithubAppMintFaultError`) is returned as-is,
 *         so the caller rethrows it untouched
 */
export const asGithubAppMintFaultWithCure = (input: {
  error: unknown;
  cure: string;
}): unknown => {
  // only a mint refusal carries a fault to cure
  const refusal = asGithubAppMintFaultError({ error: input.error });
  if (!refusal) return input.error;

  // the same refusal, with the vault's cure after the mech's hint
  // .note = joined by `;`, so a tree render puts the copyable command on its own leaf
  const hint = refusal.metadata?.hint;
  return new ConstraintError(asErrorBareMessage({ error: refusal }), {
    ...refusal.metadata,
    hint: typeof hint === 'string' ? `${hint}; ${input.cure}` : input.cure,
  });
};
