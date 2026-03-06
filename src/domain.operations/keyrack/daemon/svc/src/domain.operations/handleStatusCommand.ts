import type { IsoTimeStamp } from 'iso-time';

import type { DaemonKeyStore } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonKeyStore';

/**
 * .what = handle STATUS command to list unlocked keys with TTL left
 * .why = shows what credentials are available and when they expire
 *
 * .note = includes homeHash for daemon identity (usecase.5 observability)
 */
export const handleStatusCommand = (
  _input: Record<string, never>,
  context: {
    keyStore: DaemonKeyStore;
    homeHash: string;
  },
): {
  homeHash: string;
  keys: Array<{
    slug: string;
    env: string;
    org: string;
    expiresAt: IsoTimeStamp | null;
    ttlLeftMs: number;
  }>;
} => {
  const now = Date.now();
  const allKeys = context.keyStore.entries();

  const keys = allKeys.map((unlockedKey) => ({
    slug: unlockedKey.slug,
    env: unlockedKey.env,
    org: unlockedKey.org,
    expiresAt: unlockedKey.expiresAt ?? null,
    ttlLeftMs: unlockedKey.expiresAt
      ? Math.max(0, new Date(unlockedKey.expiresAt).getTime() - now)
      : Infinity,
  }));

  return { homeHash: context.homeHash, keys };
};
