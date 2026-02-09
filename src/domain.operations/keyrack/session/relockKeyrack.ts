import { daemonAccessRelock } from '../daemon/sdk';

/**
 * .what = relock keyrack keys by purge from daemon memory
 * .why = ends session and removes credentials from daemon
 *
 * .note = if slugs provided, only those keys are purged
 * .note = if no slugs provided, all keys are purged
 */
export const relockKeyrack = async (input: {
  slugs?: string[];
}): Promise<{
  relocked: string[];
}> => {
  const result = await daemonAccessRelock({ slugs: input.slugs });

  // daemon not reachable — no keys to relock
  if (!result) {
    return { relocked: [] };
  }

  return { relocked: result.relocked };
};
