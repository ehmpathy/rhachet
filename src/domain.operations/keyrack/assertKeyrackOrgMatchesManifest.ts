import type { KeyrackRepoManifest } from '@src/domain.objects/keyrack';

import { asKeyrackOrgMismatchRefusal } from './asKeyrackOrgMismatchRefusal';

/**
 * .what = fail fast if --org does not match the manifest org
 * .why = prevent cross-org credential configuration
 */
export const assertKeyrackOrgMatchesManifest = (input: {
  manifest: KeyrackRepoManifest;
  org: string;
}): string => {
  // @this resolves to manifest org
  if (input.org === '@this') return input.manifest.org;

  // exact match passes
  if (input.org === input.manifest.org) return input.org;

  // mismatch
  // .note = the refusal is BUILT rather than written here. this site used to render its own
  //   sentence (`org "x" does not match keyrack.yml org "y"`) — double quotes, "keyrack.yml",
  //   no hint — while the two slug sites rendered single quotes, "manifest", and a hint. one
  //   condition, three faces, and a human could meet two of them in one session
  throw asKeyrackOrgMismatchRefusal({
    givenBy: 'flag',
    orgRejected: input.org,
    orgOfManifest: input.manifest.org,
    key: null,
  });
};
