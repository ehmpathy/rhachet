import type { KeyrackRepoManifest } from '@src/domain.objects/keyrack/KeyrackRepoManifest';

import { asKeyrackOrgMismatchRefusal } from './asKeyrackOrgMismatchRefusal';

/**
 * .what = refuse a sweep `--org` filter that names a real org off the manifest's allowlist
 * .why = a sweep with a manifest asks for the declared keys under the filter's org; an org off
 *        the list is a typo or a wrong repo, and it must refuse loud with the same render the
 *        keyed verbs use, rather than sweep an empty rack (case=5)
 *
 * .note = no manifest, no filter, or `@all` → no check. the machine-wide grain names no org, and
 *         a sweep with no manifest has no allowlist to read
 * .note = the cli calls this above the passphrase prompt, and `unlockKeyrackKeys` calls it again
 *         since it is a public operation that cannot trust its caller — one rule, two sites
 */
export const assertKeyrackFilterOrgOnAllowlist = (input: {
  orgFilter: string | null;
  repoManifest: KeyrackRepoManifest | null;
  key: string | null;
}): void => {
  if (!input.repoManifest) return;
  if (!input.orgFilter || input.orgFilter === '@all') return;
  if (input.repoManifest.orgs.includes(input.orgFilter)) return;

  throw asKeyrackOrgMismatchRefusal({
    givenBy: 'flag',
    orgRejected: input.orgFilter,
    orgsOfManifest: input.repoManifest.orgs,
    key: input.key,
  });
};
