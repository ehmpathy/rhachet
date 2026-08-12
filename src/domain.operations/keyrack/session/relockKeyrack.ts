import { getKeyrackDaemonSocketPath } from '@src/domain.operations/keyrack/daemon/infra/getKeyrackDaemonSocketPath';
import { daemonAccessRelock } from '@src/domain.operations/keyrack/daemon/sdk';
import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';

/**
 * .what = relock keyrack keys by prune from daemon memory and clear vault caches
 * .why = ends session and removes credentials from daemon and vault caches
 *
 * .note = priority: slugs > env > all
 * .note = if slugs provided, only those keys are purged
 * .note = if env provided (without slugs), only keys with that env are purged
 * .note = if neither provided, all keys are purged
 * .note = if context provided, vault adapters are called to clear external caches
 *
 * .note = there is NO `reach` input, deliberately. a relock is slug-level: it purges every
 *         reach of the slugs it names (q1). the asymmetry against `unlock`, which
 *         REQUIRES `--key` beside a `--reach` (q2), is the point rather than an oversight —
 *         to grant is narrow and to revoke is wide. you must name precisely what you open;
 *         one word takes away each key beneath it. a key that survived an explicit relock
 *         because a caller forgot a flag would be a live credential a human believes is
 *         dead, which is the security-weighted half of rule.forbid.surprises.
 *         a `--reach` FILTER could be added later without a teardown, since it would only
 *         ever narrow what is already the safe default
 */
export const relockKeyrack = async (
  input?: {
    owner?: string | null;
    slugs?: string[];
    env?: string;
  },
  context?: ContextKeyrack,
): Promise<{
  relocked: string[];
}> => {
  // derive socket path from owner
  const socketPath = getKeyrackDaemonSocketPath({
    owner: input?.owner ?? null,
  });

  // the sdk's input is a UNION — a slug ask and an env sweep are two shapes, not one bag with
  // two optionals — so the documented `slugs > env > all` priority is spelled at the call site
  // rather than left for the callee to unpick. one branch per shape, and the compiler checks it
  const result = input?.slugs?.length
    ? await daemonAccessRelock({ socketPath, slugs: input.slugs })
    : await daemonAccessRelock({ socketPath, env: input?.env });
  const relocked = result?.relocked ?? [];

  // if context provided, call vault adapter relock for each slug
  const hostManifest = context?.hostManifest;
  if (context && hostManifest && relocked.length > 0) {
    for (const slug of relocked) {
      // the manifest is keyed by ADDRESS (`slug`, or `slug@exid`), while the daemon reports
      // a bare SLUG — so an index by slug would silently miss every reach of a key and
      // leave its vault unrelocked. enumerate by the entry's own `slug` field instead
      // .note = every reach is swept, deliberately: a human who locks a key means THE
      //         key, so relock is the WIDE operation (q1). to grant is narrow, to revoke is
      //         wide — the same asymmetry `unlock --reach` (which requires --key) states
      // .note = each address carries its OWN exid, so the relock is per-entry, never per-slug
      const keyHostsForSlug = Object.values(hostManifest.hosts).filter(
        (host) => host.slug === slug,
      );

      for (const keyHost of keyHostsForSlug) {
        // get the vault adapter
        const adapter = context.vaultAdapters[keyHost.vault];
        if (!adapter) continue;

        // call relock if the adapter supports it
        if (adapter.relock) {
          await adapter.relock({ slug, exid: keyHost.exid });
        }
      }
    }
  }

  return { relocked };
};
