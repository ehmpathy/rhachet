import { asKeyrackSlugFullOrNull } from './asKeyrackSlugFullOrNull';

/**
 * .what = narrow a set of slugs to those whose org segment matches a filter
 * .why = three sweep verbs (`unlock`, `list`, `status`) narrow a swept set on provenance, and
 *        each spelled the pipeline inline. one named operation is what keeps them from a drift
 *        of three subtly different reads of "the org segment" — the exact class of divergence
 *        this wish exists to close (`rule.forbid.inline-decode-friction`)
 *
 * .note = a null filter is NOT the same as an empty result — it means NO filter, so the whole
 *         set stands. that default is what makes `--org` additive: a caller who passes none
 *         observes the verb's extant scope, byte for byte (term=filter)
 * .note = the org segment is read through a parser, never a `startsWith('@all')` — a prefix test
 *         reads `@allstar.prep.FOO` as machine-wide
 *
 * ⚠️ .why.one-parser = the org is read through `asKeyrackSlugFullOrNull` — the SAME decoder
 *                    `asKeyrackSlugOrgKind` uses — never a naive `split('.')[0]`. the two answer
 *                    the one question "what org does this slug carry?", and on a naive split they
 *                    DISAGREE for a slug whose middle segment is not a valid env:
 *                    `@all.badenv.FOO` reads as org `@all` to a split and as a BARE key name to
 *                    the decoder. so a filter on the split would keep a slug that every keyed
 *                    verb then treats as bare — one verb family answers `@all`, the other
 *                    answers `bare`, for the same string, silently. this is defect 8's shape on
 *                    the FILTER side, and it is closed the same way: one parser, one answer
 * .note = a key that is not a FULL slug names NO org, so an org filter excludes it. that is the
 *         correct read, not an omission: `MY_KEY` and `my.api.KEY` each defer to `--org` rather
 *         than carry one, so neither can be narrowed ON one
 */
export const getAllKeyrackSlugsForOrg = (input: {
  slugs: string[];

  /**
   * .what = the literal org segment to keep, or null for no filter
   * .why = LITERAL, never a sigil — `@this` must already be expanded by `asKeyrackFilterOrg`,
   *        since a host slug never carries a sigil in its org segment
   */
  org: string | null;
}): string[] => {
  if (!input.org) return input.slugs;

  const org = input.org;
  return input.slugs.filter(
    (slug) => asKeyrackSlugFullOrNull({ key: slug })?.org === org,
  );
};
