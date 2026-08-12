import { MalfunctionError } from 'helpful-errors';

import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';
import type { DaemonKeyStore } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonKeyStore';

/**
 * .what = the distinct slugs a set of grants covers, in the order first seen
 * .why = `entries()` yields one row per (slug, reach), which is right for `status` — the
 *        rack shows one branch per reach. relock reports per KEY, so the same call
 *        needs the rows collapsed. one sweep, two consumers, two opposite needs
 */
const asDedupedSlugs = (input: { grants: KeyrackKeyGrant[] }): string[] => [
  ...new Set(input.grants.map((grant) => grant.slug)),
];

/**
 * .what = handle RELOCK command to purge keys from daemon memory
 * .why = allows explicit session end or selective key revocation
 *
 * .note = priority: slugs > env > all
 * .note = if slugs provided, purge only those specific keys
 * .note = if env provided (without slugs), purge only keys with that env
 * .note = if neither provided, purge all keys
 * .note = relock reports per KEY, never per reach. one slug held at three reaches is
 *         one `🔒 pruned` line, because the human locked one key. reach sits BELOW the key,
 *         so it never appears in relock output — see the dedupe on the two sweep paths,
 *         where `entries()` yields one row per (slug, reach)
 * .note = a reach NARROWS a slug purge to one reach. it exists for the `set` path,
 *         which must leave the grants held for every other reach alone. a human who
 *         relocks passes none, and so sweeps them all (q1)
 */
export const handleRelockCommand = (
  input: {
    slugs?: string[]; // if provided, purge only these
    env?: string; // if provided (without slugs), purge only keys with this env
    reach?: KeyrackKeyReach; // if provided with slugs, purge only that reach
  },
  context: {
    keyStore: DaemonKeyStore;
  },
): { relocked: string[] } => {
  // ⚠️ a reach is read ONLY by the slug branch below — the env sweep and the clear-all purge
  //    whole keys and never consult it. so a payload that pairs a reach with either would
  //    have its filter silently dropped, and the caller would believe one reach was taken
  //    when every one was. that is a failhide in the operation whose job is to REVOKE
  // .note = the sdk's input union already forecloses this for every in-repo caller. this
  //         guard exists because a daemon command arrives as parsed JSON off a socket, which
  //         no compile-time union can constrain — a wire boundary owes a runtime check
  // .note = `MalfunctionError` rather than an error aimed at a human, deliberately: no
  //         cli path can produce this shape (`keyrack relock` declares no `--reach`), so it
  //         can only arrive from a client defect — and a defect is to surface loudly, never a
  //         constraint for a human to fix (rule.require.exit-code-semantics)
  if (input.reach && !input.slugs?.length)
    throw new MalfunctionError(
      'relock received a reach with no slugs — the filter would be silently dropped',
      { reach: input.reach, env: input.env },
    );

  // if slugs provided, delete specific keys
  // .note = with no reach, ONE del sweeps every reach of the slug, and the human sees
  //         the one slug they named — so this path needs no dedupe
  if (input.slugs && input.slugs.length > 0) {
    const relockedSlugs = input.slugs.filter((slug) =>
      context.keyStore.del({ slug, reach: input.reach }),
    );
    return { relocked: relockedSlugs };
  }

  // if env provided, delete only keys with that env
  if (input.env) {
    const keysForEnv = context.keyStore.entries({ env: input.env });
    for (const key of keysForEnv) {
      context.keyStore.del({ slug: key.slug });
    }
    return { relocked: asDedupedSlugs({ grants: keysForEnv }) };
  }

  // otherwise, clear all keys
  const allKeys = context.keyStore.entries();
  context.keyStore.clear();

  return { relocked: asDedupedSlugs({ grants: allKeys }) };
};
