import type { KeyrackKey } from '../../../../../../domain.objects/keyrack/KeyrackKey';
import type { DaemonKeyStore } from '../domain.objects/daemonKeyStore';

/**
 * .what = handle GET command to retrieve keys by slug
 * .why = returns credentials from daemon memory if TTL is valid
 */
export const handleGetCommand = (
  input: {
    slugs: string[];
  },
  context: {
    keyStore: DaemonKeyStore;
  },
): {
  keys: Array<{
    slug: string;
    key: KeyrackKey;
    expiresAt: number;
  }>;
} => {
  const keys: Array<{
    slug: string;
    key: KeyrackKey;
    expiresAt: number;
  }> = [];

  for (const slug of input.slugs) {
    const unlockedKey = context.keyStore.get({ slug });
    if (unlockedKey) {
      keys.push({
        slug: unlockedKey.slug,
        key: unlockedKey.key,
        expiresAt: unlockedKey.expiresAt,
      });
    }
  }

  return { keys };
};
