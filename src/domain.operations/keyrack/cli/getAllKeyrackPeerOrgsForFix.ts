import { asKeyrackSlugFullOrNull } from '@src/domain.operations/keyrack/asKeyrackSlugFullOrNull';

/**
 * .what = the OTHER orgs whose keys are unlocked, for an `--org` narrow that came back empty
 *
 * .why = when `status --org @al` renders an empty rack, a human's next question is always
 *        "then where ARE my keys?" — so the empty render names the orgs that do hold some.
 *        an empty answer with no next move is the friction `rule.require.errors-name-the-fix`
 *        exists to close
 *
 * ⚠️ .why.now = `--org` is a flag this wish ADDED to `status`, and its empty render inherited a
 *        branch that knew only `--env`. so a typo'd `--org @al` said "(no keys unlocked)" on a
 *        rack that held an unlocked key — a silent wrong answer at exit 0, which is the same
 *        shape the `list` empty-render carried (`rule.forbid.failhide`). a flag we add owns its
 *        own empty answer
 *
 * ⚠️ .why.slug-derived = the org is read from the SLUG, never the row's stored `.org` field —
 *        because `getAllKeyrackStatusKeysForFilter` narrows on the slug. read from the stored
 *        field instead, this could name an org the filter cannot match: a row whose grant fell
 *        through carries `'unknown'` while its slug still says `@all`
 *        (`unlockKeyrackKeys.ts`). a fix line that names a value the filter would reject
 *        is worse than no fix line — it sends a human to a second empty answer
 *
 * .note = a key that is not a full slug names no org, so it contributes none. that is the same
 *         rule the filter itself holds
 */
export const getAllKeyrackPeerOrgsForFix = (input: {
  /** the unlocked keys the rack holds, across every org */
  keys: { slug: string }[];
  /** the literal org segment the human asked for — the one excluded from the answer */
  org: string;
}): string[] => {
  const orgsHeld = new Set(
    input.keys
      .map((key) => asKeyrackSlugFullOrNull({ key: key.slug })?.org ?? null)
      .filter((org): org is string => org !== null),
  );
  return [...orgsHeld].filter((org) => org !== input.org);
};
