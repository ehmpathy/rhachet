import { getEnvAllFallbackSlug } from '@src/domain.objects/keyrack/getEnvAllFallbackSlug';

/**
 * .what = the ordered slugs a reach-aware read should consider for one key —
 *         the slug as asked, then its `env=all` twin
 * .why = TWO readers walk this exact list and must never disagree: the lookup
 *        (`getAllKeyrackProbeAddresses`, which pins a reach onto each) and the enumeration
 *        (`getAllKeyrackReachesForSlug`, which collects the reaches held under each). each
 *        used to build the pair itself, so agreement rested on a comment that promised the two
 *        stay in step — and a comment cannot fail loud when it drifts. a third shot added to one
 *        and not the other would silently let a bulk unlock enumerate FEWER reaches than the
 *        lookup would go on to answer at, and no test or compiler would say so
 *
 * .note = the shared home is the point. this leaf is deliberately smaller than either caller
 *         needs on its own, because the part that must agree is exactly this list and no more —
 *         the lookup then pins a reach onto each shot, the enumeration then reads reaches off
 *         the entries each shot matches, and those halves legitimately differ
 * .note = the order is a guarantee, never incidental: the slug as asked is always shot 1, so a
 *         key declared at both its own env and at `env=all` answers from its own env first
 * .note = a slug with no `env=all` twin yields a ONE-element list, so every reachless and
 *         every already-`env=all` caller reads exactly what it read before
 */
export const getAllKeyrackProbeSlugs = (input: { slug: string }): string[] => {
  const slugForEnvAll = getEnvAllFallbackSlug({ for: { slug: input.slug } });
  if (!slugForEnvAll) return [input.slug];
  return [input.slug, slugForEnvAll];
};
