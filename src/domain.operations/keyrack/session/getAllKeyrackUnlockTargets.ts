import type { KeyrackHostManifest } from '@src/domain.objects/keyrack/KeyrackHostManifest';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';
import { getAllKeyrackReachesForSlug } from '@src/domain.operations/keyrack/reach/getAllKeyrackReachesForSlug';

/**
 * .what = expand the slugs an unlock selected into the (slug, reach) TARGETS it must unlock
 * .why = a slug is not addressable on its own — a key is cut per reach, so what an unlock
 *        actually operates on is one target per (slug, reach). an ask that NAMES a reach
 *        names exactly one; a REACHLESS ask (every bulk unlock) must additionally name each
 *        reach the rack holds, or a key cut only at reaches has no target at all and gets
 *        reported `absent` while the rack plainly holds it
 *
 * .note = ⚠️ ENUMERATED, never DERIVED. each reach comes from an entry the rack holds, so no
 *         ask is answered by a credential that was not cut for it. an ask AT a named reach
 *         still never falls back to a peer — that guard lives in the caller and is untouched
 * .note = the reachless target is ALWAYS kept, even beside enumerated reaches. it is what
 *         finds a reachless twin and what walks the `env=all` fallback, so to drop it would
 *         regress paths that have no reach in play at all. the caller prunes its `absent`
 *         row only when a reach target proves the slug is held
 * .note = a purely reachless rack yields exactly one target per slug — byte for byte the
 *         list every extant caller already had (e1)
 */
export const getAllKeyrackUnlockTargets = (input: {
  slugs: string[];
  reach?: KeyrackKeyReach;
  hosts: KeyrackHostManifest['hosts'];
}): { slug: string; reach?: KeyrackKeyReach }[] =>
  input.slugs.flatMap((slug) => {
    if (input.reach) return [{ slug, reach: input.reach }];

    const reachesHeld = getAllKeyrackReachesForSlug({
      hosts: input.hosts,
      slug,
    });
    return [{ slug }, ...reachesHeld.map((reach) => ({ slug, reach }))];
  });
