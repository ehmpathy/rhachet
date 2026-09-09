import { ConstraintError } from 'helpful-errors';

/**
 * .what = expand an `--org` FILTER value into the literal org segment it selects
 * .why = on a sweep verb the swept set is host slugs, whose org segment is always literal —
 *        `testorg`, or `@all`. so a filter compared verbatim would make `--org @this` match zero
 *        slugs and render an empty rack, which reads as "you have no repo keys" rather than
 *        "that flag needs an expansion". this is the one expansion a filter needs
 *
 * .why.pure = the expansion RULE lives here, apart from any read of a manifest, so every sweep
 *             verb shares one rule no matter where its manifest came from. `status` and `list`
 *             hold none and must load one (getOneKeyrackFilterOrg wraps this); `unlock` is
 *             HANDED one by its context. before this split, `unlock` hand-rolled the rule and
 *             the two answers diverged — `@this` with no manifest refused loud on `status` and
 *             yielded every machine-wide key on `unlock` (ehmpathy/rhachet#467 review, r001/r007/r009)
 *
 * .note = `@this` MEANS the repo manifest's org — the same sense it carries in a keyed ask
 *         (asKeyrackKeySlug.ts) and in a set (assertKeyrackOrgMatchesManifest.ts). one sigil,
 *         one sense, on every verb — which is what lets a human carry one mental model across
 *         the whole cli instead of one per verb
 * .note = `@this` is the ONLY value that needs a repo at all. `--org @all` never consults
 *         `orgOfRepo`, so a machine-wide filter costs no gitroot and no manifest — the invariant
 *         this wish exists to hold (ehmpathy/rhachet#467)
 */
export const asKeyrackFilterOrg = (input: {
  /**
   * .what = the `--org` value the caller named, or null when the flag was omitted
   * .why = REQUIRED-nullable per `rule.forbid.undefined-inputs`. an absent filter is a real
   *        answer here (the verb's extant scope stands), so it must be stated rather than
   *        inferred from an omitted property
   */
  org: string | null;

  /**
   * .what = the org this repo's manifest declares, or null when there is no manifest to read
   * .why = passed IN rather than read here, so this stays pure and one rule serves both a
   *        caller who already holds a manifest and one who must load it
   */
  orgOfRepo: string | null;
}): string | null => {
  // an absent flag is no filter at all — the verb's extant scope stands
  if (!input.org) return null;

  // every value but `@this` is already the literal segment a host slug carries
  if (input.org !== '@this') return input.org;

  // `@this` alone names the repo, so it alone needs one. fail loud and name the fix — a silent
  // empty rack, or a silent yield of the OPPOSITE provenance, is what this refusal prevents
  if (!input.orgOfRepo)
    throw new ConstraintError(
      '--org @this names this repo, but no repo keyrack.yml was found',
      {
        note: '@this expands to the org declared in .agent/keyrack.yml, and there is none to read',
        fix: 'run: rhx keyrack init --org <your-org> (or filter by --org @all for machine-wide keys)',
      },
    );

  return input.orgOfRepo;
};
