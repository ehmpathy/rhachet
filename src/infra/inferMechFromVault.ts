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
  // vaults that imply PERMANENT_VIA_REPLICA (owned, local storage)
  const replicaVaults: KeyrackHostVault[] = [
    'os.secure',
    'os.direct',
    'os.envvar',
  ];
  if (replicaVaults.includes(input.vault)) {
    return 'PERMANENT_VIA_REPLICA';
  }

  // 1password implies PERMANENT_VIA_REFERENCE (refed, pointer to external vault)
  if (input.vault === '1password') {
    return 'PERMANENT_VIA_REFERENCE';
  }

  // os.daemon implies EPHEMERAL_VIA_SESSION (session-scoped, memory only)
  if (input.vault === 'os.daemon') {
    return 'EPHEMERAL_VIA_SESSION';
  }

  // aws.iam.sso implies EPHEMERAL_VIA_AWS_SSO
  if (input.vault === 'aws.iam.sso') {
    return 'EPHEMERAL_VIA_AWS_SSO';
  }

  // unknown vault — requires explicit --mech
  return null;
};
