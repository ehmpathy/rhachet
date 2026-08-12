import type { IsoTimeStamp } from 'iso-time';

import type {
  KeyrackGrantMechanism,
  KeyrackHostVaultAdapter,
} from '@src/domain.objects/keyrack';
import { KeyrackKeyGrant } from '@src/domain.objects/keyrack';
import { asKeyrackSlugParts } from '@src/domain.operations/keyrack/asKeyrackSlugParts';
import { inferKeyGrade } from '@src/domain.operations/keyrack/grades/inferKeyGrade';

/**
 * .what = generates a mock vault adapter for tests
 * .why = enables isolated unit tests without real vault access
 */
export const genMockVaultAdapter = (input?: {
  /** whether the vault is unlocked (default: true) */
  isUnlocked?: boolean;
  /** mock storage for get/set operations */
  storage?: Record<string, string>;
  /** supported mechanisms (default: ['PERMANENT_VIA_REPLICA']) */
  supportedMechs?: KeyrackGrantMechanism[];
  /**
   * .what = the credential's OWN life, as a real mech would report it
   * .why = an ephemeral mech (github app, aws sso) mints a secret that dies on its own
   *        schedule, and `unlockKeyrackKeys` must clamp the session ttl to it (e17). absent
   *        a way to say so here, the clamp's call site could only ever be proven by the pure
   *        `computeExpiresAt` — and a regression that dropped `grantExpiresAt` at the call
   *        site would leave every test green while `status` advertised hours of life for a
   *        token github already killed
   * .note = optional, and ABSENT by default, so every extant caller of this generator gets a
   *         grant with no self-life and behaves byte-identically
   */
  grantExpiresAt?: IsoTimeStamp;
}): KeyrackHostVaultAdapter => {
  let unlocked = input?.isUnlocked ?? true;
  const storage: Record<string, string> = input?.storage ?? {};
  const supportedMechs: KeyrackGrantMechanism[] = input?.supportedMechs ?? [
    'PERMANENT_VIA_REPLICA',
  ];

  return {
    mechs: {
      supported: supportedMechs,
    },
    unlock: async () => {
      unlocked = true;
    },
    isUnlocked: async () => unlocked,
    get: async ({ slug, mech }) => {
      const secret = storage[slug];
      if (!secret) return null;
      const usedMech = mech ?? supportedMechs[0]!;
      const grade = inferKeyGrade({ vault: 'os.direct', mech: usedMech });
      const { env, org } = asKeyrackSlugParts({ slug });
      return new KeyrackKeyGrant({
        slug,
        key: { secret, grade },
        source: { vault: 'os.direct', mech: usedMech },
        env,
        org,
        expiresAt: input?.grantExpiresAt,
      });
    },
    set: async ({ slug, mech }) => {
      // mock vault does not prompt; tests must pre-populate storage
      storage[slug] = storage[slug] ?? '__mock_secret__';
      // return the mech used (first supported mech if not specified)
      return { mech: mech ?? supportedMechs[0]! };
    },
    del: async ({ slug }) => {
      delete storage[slug];
    },
  };
};
