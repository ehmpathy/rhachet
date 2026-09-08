import { asKeyrackSlugFullOrNull } from '@src/domain.operations/keyrack/asKeyrackSlugFullOrNull';
import { getAllKeyrackSlugsForOrg } from '@src/domain.operations/keyrack/getAllKeyrackSlugsForOrg';

/**
 * .what = narrow a host-manifest hosts map on env and on org
 * .why = `list` renders the rack from this map, so the filter must yield a MAP rather than a
 *        slug list. spelled inline that is an entries/filter/fromEntries round-trip, which a
 *        reader must simulate to learn it means "the same rack, narrowed"
 *        (`rule.forbid.inline-decode-friction`)
 *
 * ⚠️ .why.two-axes = this is the SLUG-side twin of `getAllKeyrackStatusKeysForFilter`, and it
 *                  carries both axes for the same reason: `list` and `status` are the two sweep
 *                  verbs over one rack, so a flag that filters one and is undeclared on the
 *                  other is an asymmetry a human cannot predict. `--env` is taught by nine
 *                  keyrack verbs; `list` alone declined it, and only incidentally — through
 *                  commander's `unknown option` at exit 1, with no tree and no fix
 * .note = the two axes are INDEPENDENT and an absent flag leaves its axis unfiltered, so they
 *         compose (`--env camp --org @all` narrows on both) — the same contract `status` holds
 * .note = the org must ALREADY be the literal segment — `asKeyrackFilterOrg` expands `@this`
 * .note = the org rule is DELEGATED to `getAllKeyrackSlugsForOrg` rather than re-stated, so
 *         `list`, `status`, `unlock`, and `source` cannot drift on what "the org segment" means
 */
export const getAllKeyrackHostsForFilter = <T>(input: {
  hosts: Record<string, T>;

  /**
   * .what = the env segment to keep, or null for no filter
   * .why = REQUIRED-nullable per `rule.forbid.undefined-inputs` — "no filter" is a real answer
   *        that must be stated, never inferred from an omitted property
   */
  env: string | null;

  /** .what = the literal org segment to keep, or null for no filter */
  org: string | null;
}): Record<string, T> => {
  // ⚠️ the env is read through the SAME validated decoder the org narrow uses, never a
  //    `split('.')[1]`. a key that is not a full slug names no env, so an env filter excludes
  //    it — for the same reason it names no org (see `getAllKeyrackSlugsForOrg`)
  const slugsForEnv = input.env
    ? Object.keys(input.hosts).filter(
        (slug) => asKeyrackSlugFullOrNull({ key: slug })?.env === input.env,
      )
    : Object.keys(input.hosts);

  const slugsKept = new Set(
    getAllKeyrackSlugsForOrg({ slugs: slugsForEnv, org: input.org }),
  );

  return Object.fromEntries(
    Object.entries(input.hosts).filter(([slug]) => slugsKept.has(slug)),
  );
};
