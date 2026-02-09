import type { KeyrackHostVaultAdapter } from '@src/domain.objects/keyrack';

/**
 * .what = generates a mock vault adapter for tests
 * .why = enables isolated unit tests without real vault access
 */
export const genMockVaultAdapter = (input?: {
  /** whether the vault is unlocked (default: true) */
  isUnlocked?: boolean;
  /** mock storage for get/set operations */
  storage?: Record<string, string>;
}): KeyrackHostVaultAdapter => {
  let unlocked = input?.isUnlocked ?? true;
  const storage: Record<string, string> = input?.storage ?? {};

  return {
    unlock: async () => {
      unlocked = true;
    },
    isUnlocked: async () => unlocked,
    get: async ({ slug }) => storage[slug] ?? null,
    set: async ({ slug, value }) => {
      storage[slug] = value;
    },
    del: async ({ slug }) => {
      delete storage[slug];
    },
  };
};
