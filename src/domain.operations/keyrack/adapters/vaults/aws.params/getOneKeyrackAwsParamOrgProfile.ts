import type {
  KeyrackHostManifest,
  KeyrackHostVault,
} from '@src/domain.objects/keyrack';

import { asKeyrackKeyEnv } from '../../../asKeyrackKeyEnv';
import { asKeyrackKeyOrg } from '../../../asKeyrackKeyOrg';

/**
 * .what = for a tree-scoped (specific-org) aws.params key, look up the org's keyrack-declared
 *         AWS_PROFILE — the exid of the peer `{org}.{env}.AWS_PROFILE` host-manifest entry
 * .why = the org-scope hardcut's tree-wide identity source is a manifest fact, never an ambient
 *        env-grab. an @all key needs no profile (it uses the grove's IMDS role), and every
 *        non-aws.params vault ignores the field — so both cases return null
 *        (see .agent/repo=.this/role=keyrack/briefs/define.keyrack-org-scope.grove-vs-tree.md)
 */
export const getOneKeyrackAwsParamOrgProfile = (input: {
  vault: KeyrackHostVault;
  slug: string;
  hostManifest: KeyrackHostManifest;
}): string | null => {
  // only a tree-scoped aws.params key carries an org profile
  if (input.vault !== 'aws.params') return null;
  const org = asKeyrackKeyOrg({ slug: input.slug });
  if (org === '@all') return null;

  // the org's AWS_PROFILE lives in its own peer host-manifest entry, keyed by org+env
  const env = asKeyrackKeyEnv({ slug: input.slug });
  const peerSlug = `${org}.${env}.AWS_PROFILE`;
  return input.hostManifest.hosts[peerSlug]?.exid ?? null;
};
