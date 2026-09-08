import { ConstraintError } from 'helpful-errors';

import { asKeyrackSlugFullOrNull } from './asKeyrackSlugFullOrNull';

/**
 * .what = refuses honestly when a KEYED ask names a key that exists, but that the `--org` filter
 *         excluded — instead of the "not found" the caller would otherwise be told
 * .why = a filter-empty and an absent-key are the same EMPTY SET, and on a sweep the empty set is
 *        the true answer (`--org otherorg` honestly selects none). on a KEYED ask it is not: the
 *        human named ONE key, it is held, and the refusal that says "not found" is a FALSEHOOD
 *        that sends them to `rhx keyrack set` to re-create a credential they already hold
 *
 * ⚠️ .why.a-third-verdict = the two extant outcomes — a resolved set, or "not found" — cannot
 *        express "held, but excluded". the fix is not to soften the not-found (that refusal is
 *        correct when the key truly is absent) but to split the case ABOVE it, so each verdict
 *        states what is true. `rule.require.errors-name-the-fix`: the fix here is to drop or
 *        correct `--org`, never to mint a key
 *
 * .note = this reads the set BEFORE the filter and the set AFTER it, because the difference
 *         between the two IS the reported fact. a check on the after-set alone cannot tell an
 *         excluded key from an absent one — that is precisely how the falsehood arose
 */
export const assertKeyrackKeyAskSurvivedOrgFilter = (input: {
  /** .what = the key the ask names, or null for a sweep (a sweep is never checked here) */
  keyAsk: string | null;

  /** .what = the expanded `--org` filter, or null for "no filter" */
  orgFilter: string | null;

  /** .what = the slugs the ask resolved to, before the org filter was applied */
  slugsBeforeFilter: string[];

  /** .what = the same slugs, after the org filter was applied */
  slugsAfterFilter: string[];
}): void => {
  // a sweep, an unfiltered ask, a genuinely-absent key, or a key that survived: none is this case
  if (!input.keyAsk) return;
  if (!input.orgFilter) return;
  if (input.slugsBeforeFilter.length === 0) return;
  if (input.slugsAfterFilter.length > 0) return;

  // name the orgs the key IS held under — that is the fact the human needs to correct the flag
  const orgsHeld = [
    ...new Set(
      input.slugsBeforeFilter
        .map((slug) => asKeyrackSlugFullOrNull({ key: slug })?.org)
        .filter((org): org is string => !!org),
    ),
  ];

  throw new ConstraintError(`key excluded by --org filter: ${input.keyAsk}`, {
    keyAsk: input.keyAsk,
    orgFilter: input.orgFilter,
    orgsHeld,
    note: `'${input.keyAsk}' IS held${orgsHeld.length ? ` (under ${orgsHeld.join(', ')})` : ''}, but --org ${input.orgFilter} excludes it — this is a filter miss, not an absent key`,
    fix: `re-run without --org, or with --org ${orgsHeld[0] ?? '<the org that holds it>'}`,
  });
};
