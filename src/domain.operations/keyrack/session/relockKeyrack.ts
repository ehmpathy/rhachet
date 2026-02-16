import { getKeyrackDaemonSocketPath } from '../daemon/infra/getKeyrackDaemonSocketPath';
import { daemonAccessRelock } from '../daemon/sdk';
import type { KeyrackGrantContext } from '../genKeyrackGrantContext';

/**
 * .what = relock keyrack keys by prune from daemon memory and clear vault caches
 * .why = ends session and removes credentials from daemon and vault caches
 *
 * .note = priority: slugs > env > all
 * .note = if slugs provided, only those keys are purged
 * .note = if env provided (without slugs), only keys with that env are purged
 * .note = if neither provided, all keys are purged
 * .note = if context provided, vault adapters are called to clear external caches
 */
export const relockKeyrack = async (
  input?: {
    owner?: string | null;
    slugs?: string[];
    env?: string;
  },
  context?: KeyrackGrantContext,
): Promise<{
  relocked: string[];
}> => {
  // resolve socket path based on owner
  const socketPath = getKeyrackDaemonSocketPath({
    owner: input?.owner ?? null,
  });

  const result = await daemonAccessRelock({
    socketPath,
    slugs: input?.slugs,
    env: input?.env,
  });
  const relocked = result?.relocked ?? [];

  // if context provided, call vault adapter relock for each slug
  if (context && relocked.length > 0) {
    for (const slug of relocked) {
      // find which vault this slug uses from host manifest
      const keyHost = context.hostManifest.hosts[slug];
      if (!keyHost) continue;

      // get the vault adapter
      const adapter = context.vaultAdapters[keyHost.vault];
      if (!adapter) continue;

      // call relock if the adapter supports it
      if (adapter.relock) {
        await adapter.relock({ slug, exid: keyHost.exid });
      }
    }
  }

  return { relocked };
};
