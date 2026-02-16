import type { KeyrackGrantMechanism } from '../../../../../../domain.objects/keyrack/KeyrackGrantMechanism';
import type { KeyrackHostVault } from '../../../../../../domain.objects/keyrack/KeyrackHostVault';
import type { KeyrackKey } from '../../../../../../domain.objects/keyrack/KeyrackKey';
import type { DaemonKeyStore } from '../domain.objects/daemonKeyStore';

/**
 * .what = handle UNLOCK command to store grants with TTL
 * .why = caches credentials in daemon memory for session-time access
 */
export const handleUnlockCommand = (
  input: {
    keys: Array<{
      slug: string;
      key: KeyrackKey;
      source: {
        vault: KeyrackHostVault;
        mech: KeyrackGrantMechanism;
      };
      env: string;
      org: string;
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
      source: keyEntry.source,
      env: keyEntry.env,
      org: keyEntry.org,
      expiresAt: keyEntry.expiresAt,
    });
    unlockedSlugs.push(keyEntry.slug);
  }

  return { unlocked: unlockedSlugs };
};
