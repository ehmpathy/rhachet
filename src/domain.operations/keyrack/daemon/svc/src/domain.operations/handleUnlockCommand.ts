import type { KeyrackKeyGrant } from '../../../../../../domain.objects/keyrack/KeyrackKeyGrant';
import type { DaemonKeyStore } from '../domain.objects/daemonKeyStore';

/**
 * .what = handle UNLOCK command to store grants with TTL
 * .why = caches credentials in daemon memory for session-time access
 */
export const handleUnlockCommand = (
  input: {
    keys: KeyrackKeyGrant[];
  },
  context: {
    keyStore: DaemonKeyStore;
  },
): { unlocked: string[] } => {
  const unlockedSlugs: string[] = [];

  for (const grant of input.keys) {
    context.keyStore.set({ grant });
    unlockedSlugs.push(grant.slug);
  }

  return { unlocked: unlockedSlugs };
};
