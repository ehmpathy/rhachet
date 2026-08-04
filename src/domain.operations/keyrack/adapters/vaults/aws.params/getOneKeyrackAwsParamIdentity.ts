import type { KeyrackHostManifest } from '@src/domain.objects/keyrack';

import { asKeyrackKeyOrg } from '../../../asKeyrackKeyOrg';
import type { KeyrackAwsParamIdentity } from './asKeyrackAwsParamIdentity';
import { asKeyrackAwsParamIdentity } from './asKeyrackAwsParamIdentity';
import { getOneKeyrackAwsParamOrgProfile } from './getOneKeyrackAwsParamOrgProfile';

/**
 * .what = derive the AWS identity an aws.params key authenticates as, from its slug + the host
 *         manifest — the ONE place the --org hardcut is decided. combines the two facts it needs:
 *         the org (from the slug) and that org's keyrack-declared AWS_PROFILE (from the manifest)
 * .why = every aws.params op (get/set/del) needs the SAME identity, so it is decided once here —
 *        the total KeyrackAwsParamIdentity — and threaded to the leaves. this retires the bare
 *        `orgAwsProfile: string | null` that each leaf had to re-combine with the org to interpret
 *        (a mechanism-named half-value, with null overloaded between "@all → imds" and "org with
 *        no profile"). the specific-org-with-no-profile failfast lives in asKeyrackAwsParamIdentity,
 *        so it fires ONCE here, early, not deep in a write leaf
 *
 * .note = @all → { source: 'imds' } (the grove's instance role); a specific org with a declared
 *         profile → { source: 'profile', profile }; a specific org with NO declared profile →
 *         throws a ConstraintError that names the fix (never a silent IMDS fallback)
 */
export const getOneKeyrackAwsParamIdentity = (input: {
  slug: string;
  // null when no manifest is in scope (a fallback path / a test); an @all slug still derives to
  // imds, and a specific-org slug still fails loud (no declared profile), so a null manifest never
  // yields a silent wrong identity
  hostManifest: KeyrackHostManifest | null;
}): KeyrackAwsParamIdentity => {
  const org = asKeyrackKeyOrg({ slug: input.slug });
  const profileForOrg = input.hostManifest
    ? getOneKeyrackAwsParamOrgProfile({
        vault: 'aws.params',
        slug: input.slug,
        hostManifest: input.hostManifest,
      })
    : null;
  return asKeyrackAwsParamIdentity({ org, profileForOrg });
};
