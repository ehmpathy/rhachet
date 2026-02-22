import type { DaemonKeyStore } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonKeyStore';

/**
 * .what = handle RELOCK command to purge keys from daemon memory
 * .why = allows explicit session end or selective key revocation
 *
 * .note = priority: slugs > env > all
 * .note = if slugs provided, purge only those specific keys
 * .note = if env provided (without slugs), purge only keys with that env
 * .note = if neither provided, purge all keys
 */
export const handleRelockCommand = (
  input: {
    slugs?: string[]; // if provided, purge only these
    env?: string; // if provided (without slugs), purge only keys with this env
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

  // if env provided, delete only keys with that env
  if (input.env) {
    const keysForEnv = context.keyStore.entries({ env: input.env });
    for (const key of keysForEnv) {
      context.keyStore.del({ slug: key.slug });
      relockedSlugs.push(key.slug);
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
