import { daemonAccessRelock } from '../daemon/sdk';
import type { KeyrackGrantContext } from '../genKeyrackGrantContext';

/**
 * .what = relock keyrack keys by prune from daemon memory and clear vault caches
 * .why = ends session and removes credentials from daemon and vault caches
 *
 * .note = if slugs provided, only those keys are pruned
 * .note = if no slugs provided, all keys are pruned
 * .note = if context provided, vault adapters are called to clear external caches
 */
export const relockKeyrack = async (
  input: {
    slugs?: string[];
  },
  context?: KeyrackGrantContext,
): Promise<{
  relocked: string[];
}> => {
  // prune from daemon memory
  const result = await daemonAccessRelock({ slugs: input.slugs });
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
