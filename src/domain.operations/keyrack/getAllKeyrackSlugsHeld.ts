import type { KeyrackKeyHost } from '@src/domain.objects/keyrack/KeyrackKeyHost';

/**
 * .what = name the distinct SLUGS a host manifest holds, read off each entry's own `slug` field
 * .why = `hosts` is keyed by ADDRESS (`slug@reachExid` for a key cut at a reach), so the map's
 *   KEYS are not slugs. every caller that wants "which keys does this rack hold" must read the
 *   `slug` FIELD each entry records — and the three that do had each hand-rolled the same
 *   `new Set(Object.values(hosts).map(...))` reduction, re-derived the same invariant in its own
 *   comment, and offered a fourth place for the address-vs-slug defect to be reintroduced by hand
 *
 * .note = ⛔ an address is CONSTRUCT-ONLY and must NEVER be split back on `@` — a reach exid is
 *   an email and legally holds one, so a split is not well-defined (`term=address`). that is the
 *   whole reason this reads a field rather than parses a key, and the reason it is worth one
 *   named home rather than three identical inline copies
 * .note = DEDUPED, because N reaches of one slug are N addresses but ONE slug. every caller here
 *   asks which keys are held, never at how many reaches — the reach is re-applied per slug
 *   downstream (`getOneKeyrackHostForSlugAtReach`)
 * .note = the three sites this replaces were byte-identical. the peers that answer a DIFFERENT
 *   question off the same map — `getOneKeyrackAwsParamOrgProfile` (find one host by slug),
 *   `relockKeyrack` (filter entries), `getAllKeyrackReachesForSlug` (collect reaches) — are
 *   deliberately NOT folded in: a shared leaf that served all six would need a shape that fits
 *   none of them well (`rule.prefer.wet-over-dry`)
 */
export const getAllKeyrackSlugsHeld = (input: {
  hosts: Record<string, KeyrackKeyHost>;
}): string[] => [
  ...new Set(Object.values(input.hosts).map((host) => host.slug)),
];
