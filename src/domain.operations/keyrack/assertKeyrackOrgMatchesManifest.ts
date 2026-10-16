import type { KeyrackRepoManifest } from '@src/domain.objects/keyrack';

import { asKeyrackOrgMismatchRefusal } from './asKeyrackOrgMismatchRefusal';

/**
 * .what = fail fast if --org is not on the manifest's org allowlist
 * .why = prevent cross-org credential configuration; a member org may be set and deleted
 */
export const assertKeyrackOrgMatchesManifest = (input: {
  manifest: KeyrackRepoManifest;
  org: string;
}): string => {
  // @this means the default org
  if (input.org === '@this') return input.manifest.org;

  // a member of the allowlist passes
  if (input.manifest.orgs.includes(input.org)) return input.org;

  // mismatch
  // .note = the refusal is BUILT rather than written here. this site used to render its own
  //   sentence (`org "x" does not match keyrack.yml org "y"`) — double quotes, "keyrack.yml",
  //   no hint — while the two slug sites rendered single quotes, "manifest", and a hint. one
  //   condition, three faces, and a human could meet two of them in one session
  throw asKeyrackOrgMismatchRefusal({
    givenBy: 'flag',
    orgRejected: input.org,
    orgsOfManifest: input.manifest.orgs,
    key: null,
  });
};
