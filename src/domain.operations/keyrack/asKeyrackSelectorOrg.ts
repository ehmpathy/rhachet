/**
 * .what = expand an `--org` SELECTOR value into the org a keyed domain lookup wants
 * .why = on a keyed verb the flag SELECTS the org segment of one slug, and the domain lookup
 *        (getOneKeyrackGrantByKey) reads an ABSENT org as "take the manifest's". so `@this` —
 *        which means exactly that — must arrive absent, never verbatim. handed through literally
 *        it hits the mismatch guard and throws `org '@this' does not match manifest org '<x>'`
 *        for the one value that names that very manifest (ehmpathy/rhachet#467 review, r006)
 *
 * .why.named = the selector arity is the twin of `asKeyrackFilterOrg`, and it earns a name for
 *              the same reason: the rule was hand-rolled inline on `get` and simply absent on
 *              `source`, so one flag carried two behaviors on two verbs. a rule with a name is
 *              applied once and shared; a rule inlined is re-derived per call site, and the
 *              call site that forgets it is the defect
 *
 * .note = the two arities need OPPOSITE shapes, which is why one cast cannot serve both. a
 *         filter expands `@this` to the LITERAL org, because it compares against host slugs that
 *         carry a literal segment. a selector expands it to ABSENT, because it hands the choice
 *         to the manifest the lookup already holds. same sigil, same sense — different consumer
 *         (`term=sweep._.choice.example=org-filter-vs-selector`)
 * .note = `@all` passes through untouched. it is the one value that names no repo, so the
 *         lookup's own `@all` branch must see it to build a machine-wide slug
 */
export const asKeyrackSelectorOrg = (input: {
  /**
   * .what = the `--org` value the caller named, or null when the flag was omitted
   * .why = REQUIRED-nullable per `rule.forbid.undefined-inputs`. an omitted flag is a real
   *        answer here (defer to the manifest), so it must be stated rather than inferred
   */
  org: string | null;
}): string | undefined => {
  // an omitted flag defers to the manifest — which is what an absent org means downstream
  if (!input.org) return undefined;

  // `@this` MEANS the manifest's org, and absent is how the lookup spells that
  if (input.org === '@this') return undefined;

  // every other value is already the literal segment the slug should carry
  return input.org;
};
