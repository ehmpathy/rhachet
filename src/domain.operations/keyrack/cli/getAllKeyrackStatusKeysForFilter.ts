import { asKeyrackSlugFullOrNull } from '@src/domain.operations/keyrack/asKeyrackSlugFullOrNull';
import type { DaemonStatusRow } from '@src/domain.operations/keyrack/daemon/sdk';
import { getAllKeyrackSlugsForOrg } from '@src/domain.operations/keyrack/getAllKeyrackSlugsForOrg';

/**
 * .what = narrow the unlocked-key rows `status` reports, on env and on org
 * .why = the two axes are INDEPENDENT and an absent flag leaves its axis unfiltered, so they
 *        compose (`--env camp --org @all` narrows on both). spelled inline, that is a chained
 *        two-stage pipeline with a compound boolean per stage — a reader must simulate it to
 *        learn it means "narrowed on two independent axes" (`rule.forbid.inline-decode-friction`)
 *
 * .note = the org must ALREADY be the literal segment — `@this` is a sigil, and a sigil compared
 *         verbatim matches zero rows and renders an empty rack. `asKeyrackFilterOrg` is what
 *         expands it, and the caller owes that expansion before this narrow
 *
 * ⚠️ .why.one-parser = the org axis delegates to `getAllKeyrackSlugsForOrg`, which reads the
 *        SLUG rather than the row's stored `.org` field — so `status` shares the one decoder its
 *        two sweep siblings use (`getAllKeyrackHostsForFilter`, `getAllKeyrackAttemptsForOrg`).
 *        the stored field is NOT the slug's org segment: `unlockKeyrackKeys.ts` mints it
 *        from a fallback chain (`hostConfig.org ?? grant.org ?? slugOrg ?? repoManifest?.org ??
 *        'unknown'`), so a key whose grant fell through carries `'unknown'` while its slug still
 *        says `@all`. filtered on the stored field, `status --org @all` would omit that key while
 *        `list --org @all` — slug-derived, over the same rack — kept it: one flag, one sigil, two
 *        verbs, two membership answers, no error. the general shape — one flag answered from a
 *        STORED field on one verb and from the SLUG on another — is closed the same way wherever
 *        it appears: read the slug, which is the key's own name rather than a record of how one
 *        grant resolved
 * ⚠️ .why.one-parser.env = the ENV axis reads the SLUG too, for the identical reason and through
 *        the identical decoder `list` uses (`asKeyrackSlugFullOrNull`). the stored env has its
 *        OWN fallback chain, minted beside the org's — `unlockKeyrackKeys.ts` sets
 *        `hostConfig.env ?? grant.env ?? slugEnv ?? env` — so a row minted from `hostConfig.env`,
 *        or from the ASK's `env` when the slug carried none, records an env its slug never
 *        spells. filtered on that field, `status --env X` and `list --env X` answered differently
 *        over one rack, with no error on either side. the widest source of that drift is the last
 *        fallback (`?? env`), which records the ASK rather than a property of the key
 * ⚠️ .why.both-axes = BOTH axes read the slug, and to convert one alone would be worse than to
 *        convert neither. a human composes `--env camp --org @all` as one command, so an
 *        operation that answered one flag from a stored value and the other from the slug would
 *        narrow on two different notions of the rack at once. a two-reader divergence closed on
 *        one axis and left on its twin is a hazard moved, never a hazard closed
 * .note = a key that is not a full slug names no env, so an env filter excludes it — for exactly
 *         the reason it names no org. that is the rule `list` already held
 */
export const getAllKeyrackStatusKeysForFilter = (input: {
  keys: DaemonStatusRow[];

  /**
   * .what = the env to keep, or null for no filter
   * .why = REQUIRED-nullable per `rule.forbid.undefined-inputs` — "no filter" is a real answer
   *        that must be stated, never inferred from an omitted property
   */
  env: string | null;

  /** .what = the literal org segment to keep, or null for no filter */
  org: string | null;
}): DaemonStatusRow[] => {
  // the env axis, read through the SAME validated decoder `list` uses, never the stored field
  const keysForEnv = input.env
    ? input.keys.filter(
        (key) => asKeyrackSlugFullOrNull({ key: key.slug })?.env === input.env,
      )
    : input.keys;

  // the org axis, read through the one slug decoder every sweep verb shares
  const slugsForOrg = new Set(
    getAllKeyrackSlugsForOrg({
      slugs: keysForEnv.map((key) => key.slug),
      org: input.org,
    }),
  );
  return keysForEnv.filter((key) => slugsForOrg.has(key.slug));
};
