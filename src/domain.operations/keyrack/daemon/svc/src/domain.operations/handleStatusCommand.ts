import type { DaemonKeyStore } from '../domain.objects/daemonKeyStore';

/**
 * .what = handle STATUS command to list unlocked keys with TTL left
 * .why = shows what credentials are available and when they expire
 */
export const handleStatusCommand = (
  _input: Record<string, never>,
  context: {
    keyStore: DaemonKeyStore;
  },
): {
  keys: Array<{
    slug: string;
    expiresAt: number;
    ttlLeftMs: number;
  }>;
} => {
  const now = Date.now();
  const allKeys = context.keyStore.entries();

  const keys = allKeys.map((unlockedKey) => ({
    slug: unlockedKey.slug,
    expiresAt: unlockedKey.expiresAt,
    ttlLeftMs: Math.max(0, unlockedKey.expiresAt - now),
  }));

  return { keys };
};
