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

  // the org's AWS_PROFILE lives in its own peer host-manifest entry, named by org+env
  //
  // ⚠️ matched on each entry's own `slug` FIELD, never by index into the map — `hosts` is keyed
  //    by ADDRESS (`slug@reachExid`), so a hand-built slug can never match an entry cut at a
  //    reach, and the tree-scoped key would silently fall back to no profile at all. an address
  //    is construct-only and is never split back on `@` (`term=address`)
  // .note = a reachless entry has `slug === address`, so every extant rack answers identically
  // .note = it takes the FIRST match, and a rack that holds this peer at several reaches is a
  //         state the org-scope hardcut does not sanction: the tree-wide identity is ONE profile
  //         per (org, env) by construction, so a per-reach AWS_PROFILE is not a shape to choose
  //         between (`define.keyrack-org-scope.grove-vs-tree`)
  const env = asKeyrackKeyEnv({ slug: input.slug });
  const peerSlug = `${org}.${env}.AWS_PROFILE`;
  const peerHost = Object.values(input.hostManifest.hosts).find(
    (host) => host.slug === peerSlug,
  );
  return peerHost?.exid ?? null;
};
