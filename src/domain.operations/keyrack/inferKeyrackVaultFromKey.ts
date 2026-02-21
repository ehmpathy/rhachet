import type { KeyrackHostVault } from '@src/domain.objects/keyrack';

/**
 * .what = infers vault hint from key name
 * .why = some key names have a strong signal for which vault to use (e.g., AWS_PROFILE → aws.iam.sso)
 *
 * .note = returns null if no vault can be inferred from the key name
 */
export const inferKeyrackVaultFromKey = (input: {
  keyName: string;
}): KeyrackHostVault | null => {
  if (input.keyName === 'AWS_PROFILE') return 'aws.iam.sso';
  return null;
};
