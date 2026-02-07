import { daemonAccessStatus } from '../daemon/sdk';

/**
 * .what = get status of unlocked keys in daemon
 * .why = shows what keys are available and how much time is left
 */
export const getKeyrackStatus = async (): Promise<{
  keys: Array<{
    slug: string;
    expiresAt: number;
    ttlLeftMs: number;
  }>;
} | null> => {
  const result = await daemonAccessStatus({});

  // daemon not reachable — return null
  if (!result) {
    return null;
  }

  return {
    keys: result.keys.map((k) => ({
      slug: k.slug,
      expiresAt: k.expiresAt,
      ttlLeftMs: k.ttlLeftMs,
    })),
  };
};
