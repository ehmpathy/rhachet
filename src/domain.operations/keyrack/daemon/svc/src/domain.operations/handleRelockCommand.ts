import type { DaemonKeyStore } from '../domain.objects/daemonKeyStore';

/**
 * .what = handle RELOCK command to purge keys from daemon memory
 * .why = allows explicit session end or selective key revocation
 */
export const handleRelockCommand = (
  input: {
    slugs?: string[]; // if provided, purge only these; if absent, purge all
  },
  context: {
    keyStore: DaemonKeyStore;
  },
): { relocked: string[] } => {
  const relockedSlugs: string[] = [];

  // if slugs provided, delete specific keys
  if (input.slugs && input.slugs.length > 0) {
    for (const slug of input.slugs) {
      const wasDeleted = context.keyStore.del({ slug });
      if (wasDeleted) {
        relockedSlugs.push(slug);
      }
    }
    return { relocked: relockedSlugs };
  }

  // otherwise, clear all keys
  const allKeys = context.keyStore.entries();
  for (const key of allKeys) {
    relockedSlugs.push(key.slug);
  }
  context.keyStore.clear();

  return { relocked: relockedSlugs };
};
