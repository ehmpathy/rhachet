import type {
  KeyrackGrantMechanism,
  KeyrackHostVault,
} from '@src/domain.objects/keyrack';

/**
 * .what = infers grant mechanism from vault type
 * .why = most vaults have only one valid mechanism, so explicit --mech is unnecessary
 *
 * .note = returns null if vault has multiple valid mechanisms (requires explicit --mech)
 */
export const inferMechFromVault = (input: {
  vault: KeyrackHostVault;
}): KeyrackGrantMechanism | null => {
  // vaults that imply PERMANENT_VIA_REPLICA
  const permanentVaults: KeyrackHostVault[] = [
    'os.secure',
    'os.direct',
    'os.envvar',
    '1password',
  ];
  if (permanentVaults.includes(input.vault)) {
    return 'PERMANENT_VIA_REPLICA';
  }

  // vaults that imply EPHEMERAL_VIA_AWS_SSO
  if (input.vault === 'aws.iam.sso') {
    return 'EPHEMERAL_VIA_AWS_SSO';
  }

  // os.daemon can serve any mech — requires explicit --mech
  return null;
};
