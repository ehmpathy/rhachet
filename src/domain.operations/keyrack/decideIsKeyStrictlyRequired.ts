import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';
import type { KeyrackRepoManifest } from '@src/domain.objects/keyrack/KeyrackRepoManifest';

/**
 * .what = decides if a non-granted key is strictly required
 * .why = enables is-optional-if-has waiver in strict mode
 *
 * .note = locked/blocked keys are always required (no waiver)
 * .note = absent keys with isOptionalIfHas are waived if alternative is set
 */
export const decideIsKeyStrictlyRequired = (input: {
  /**
   * the grant attempt to check (must be non-granted: absent, locked, or blocked)
   */
  attempt: KeyrackGrantAttempt;

  /**
   * manifest to lookup flags from
   */
  manifest: KeyrackRepoManifest;

  /**
   * current environment variables (to check if alternative is set)
   */
  env: Record<string, string | undefined>;
}): boolean => {
  const { attempt, manifest, env } = input;

  // locked/blocked are always strictly required (no waiver possible)
  if (attempt.status !== 'absent') return true;

  // lookup flags from manifest spec
  const spec = manifest.keys[attempt.slug];
  const alt = spec?.flags.isOptionalIfHas;
  if (!alt) return true;

  // absent with isOptionalIfHas → check if alternative is set in env
  // if alternative is set, requirement is waived (not strictly required)
  // if alternative is not set, requirement stands (strictly required)
  return !env[alt];
};
