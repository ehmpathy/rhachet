import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';

import { asKeyrackKeySlugAtReach } from './asKeyrackKeySlugAtReach';
import { getAllKeyrackProbeSlugs } from './getAllKeyrackProbeSlugs';

/**
 * .what = the ordered addresses a lookup should probe for one key at one reach —
 *         the slug as asked, then its `env=all` twin, each AT THE SAME REACH
 * .why = this ordering is the single most safety-critical invariant of the reach axis, and
 *        it was hand-written at three separate lookups (the daemon store, the host manifest,
 *        the not-granted status probe), each with its own copy of the same comment. a future
 *        change — a second fallback tier, a different order — had to be made correctly in
 *        three places, with no mechanism to notice if one was missed
 *
 * .note = ⚠️ THE invariant: the env=all shot CARRIES THE REACH ACROSS. a slug-only fallback
 *         would let an ask at `org.test.KEY@$reach` land on the REACHLESS `org.all.KEY` and
 *         hand back a credential for the wrong reach — e18's exact failure shape, one
 *         layer below where the identity axis removed it. one home for the rule means one
 *         place it can be got wrong, and one test that guards it
 *
 * .note = it returns the SLUG beside each address, because the callers differ in what they
 *         need. two of the three probe by address alone; the manifest lookup must also report
 *         which slug answered, so it can tell the caller whether the env=all twin was used
 * .note = pure — it builds addresses and reads no store. each caller applies its own probe
 *         (a map read, a TTL-checked store read, an inventory existence check) to the list,
 *         which is exactly the part that legitimately differs between them
 */
export const getAllKeyrackProbeAddresses = (input: {
  slug: string;
  reach?: KeyrackKeyReach;
}): { address: string; slug: string }[] =>
  // the shots themselves come from the SHARED list, so the enumeration that walks the same two
  // (`getAllKeyrackReachesForSlug`) cannot drift out of step with this lookup. this function's
  // own job is the part that is its alone: pin the reach onto each shot
  // .note = a reachless address IS the bare slug, so a reachless caller reads a list identical
  //         to what it read before the reach axis existed (e1)
  getAllKeyrackProbeSlugs({ slug: input.slug }).map((slug) => ({
    address: asKeyrackKeySlugAtReach({ slug, reach: input.reach }),
    slug,
  }));
