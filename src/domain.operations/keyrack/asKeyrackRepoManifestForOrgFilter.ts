import type { KeyrackRepoManifest } from '@src/domain.objects/keyrack/KeyrackRepoManifest';

import { asKeyrackRepoManifestUnderOrg } from './asKeyrackRepoManifestUnderOrg';
import { assertKeyrackFilterOrgOnAllowlist } from './assertKeyrackFilterOrgOnAllowlist';

/**
 * .what = the repo manifest a sweep asks under, given its `--org` filter
 * .why = every sweep verb that builds its slugs from the declared keys (`unlock`, `source`,
 *        `get --for repo`) owes the same two steps: refuse an org off the allowlist, and re-slug
 *        the declared keys under a member. one operation holds both, so no verb can do one and
 *        skip the other — one flag, one answer on every sweep (case=4, case=5)
 *
 * .note = no manifest, no filter, `@all`, or the default org → the manifest as given
 */
export const asKeyrackRepoManifestForOrgFilter = (input: {
  repoManifest: KeyrackRepoManifest | null;
  orgFilter: string | null;
  key: string | null;
}): KeyrackRepoManifest | null => {
  // a real org off the allowlist refuses loud, never an empty rack
  assertKeyrackFilterOrgOnAllowlist({
    orgFilter: input.orgFilter,
    repoManifest: input.repoManifest,
    key: input.key,
  });

  // only a real org filter re-slugs; the machine-wide grain and a bare sweep read as declared
  if (!input.repoManifest) return null;
  if (!input.orgFilter || input.orgFilter === '@all') return input.repoManifest;
  return asKeyrackRepoManifestUnderOrg({
    manifest: input.repoManifest,
    org: input.orgFilter,
  });
};
