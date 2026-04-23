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
