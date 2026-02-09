import type {
  KeyrackGrantMechanism,
  KeyrackHostVault,
  KeyrackKeyGrade,
} from '../../../domain.objects/keyrack';

/**
 * .what = infer key grade from vault and mechanism
 * .why = vault determines protection, mechanism determines duration
 *
 * .note = os.daemon protection is 'encrypted' because keys are in memory only (never on disk)
 */
export const inferKeyGrade = (input: {
  vault: KeyrackHostVault;
  mech: KeyrackGrantMechanism;
}): KeyrackKeyGrade => {
  // infer protection from vault
  const protection = (() => {
    if (input.vault === 'os.envvar') return 'plaintext' as const;
    if (input.vault === 'os.direct') return 'plaintext' as const;
    if (input.vault === 'os.secure') return 'encrypted' as const;
    if (input.vault === 'os.daemon') return 'encrypted' as const;
    if (input.vault === '1password') return 'encrypted' as const;
    return 'plaintext' as const; // fallback for unknown vaults
  })();

  // infer duration from mechanism
  const duration = (() => {
    // new prefixed names
    if (input.mech === 'PERMANENT_VIA_REPLICA') return 'permanent' as const;
    if (input.mech === 'EPHEMERAL_VIA_GITHUB_APP') return 'ephemeral' as const;
    if (input.mech === 'EPHEMERAL_VIA_AWS_SSO') return 'ephemeral' as const;
    if (input.mech === 'EPHEMERAL_VIA_GITHUB_OIDC') return 'ephemeral' as const;
    // deprecated aliases (backwards compat)
    if (input.mech === 'REPLICA') return 'permanent' as const;
    if (input.mech === 'GITHUB_APP') return 'ephemeral' as const;
    if (input.mech === 'AWS_SSO') return 'ephemeral' as const;
    return 'permanent' as const; // fallback for unknown mechanisms
  })();

  // special case: os.daemon always has transient duration (session-time only)
  const durationFinal =
    input.vault === 'os.daemon' ? ('transient' as const) : duration;

  return { protection, duration: durationFinal };
};
