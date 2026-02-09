import type { KeyrackKey } from '../../../../../../domain.objects/keyrack/KeyrackKey';
import type { DaemonKeyStore } from '../domain.objects/daemonKeyStore';

/**
 * .what = handle UNLOCK command to store keys with TTL
 * .why = caches credentials in daemon memory for session-time access
 */
export const handleUnlockCommand = (
  input: {
    keys: Array<{
      slug: string;
      key: KeyrackKey;
      expiresAt: number;
    }>;
  },
  context: {
    keyStore: DaemonKeyStore;
  },
): { unlocked: string[] } => {
  const unlockedSlugs: string[] = [];

  for (const keyEntry of input.keys) {
    context.keyStore.set({
      slug: keyEntry.slug,
      key: keyEntry.key,
      expiresAt: keyEntry.expiresAt,
    });
    unlockedSlugs.push(keyEntry.slug);
  }

  return { unlocked: unlockedSlugs };
};
