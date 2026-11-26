import { seedHostManifestEntries } from './seedHostManifestEntries';

/**
 * .what = seed a `{org}.{env}.AWS_PROFILE` peer entry into an owner-scoped host manifest
 * .why = the org-scope hardcut authenticates a specific-org aws.params write as that org's
 *        declared AWS_PROFILE — the exid of the peer `{org}.{env}.AWS_PROFILE` host-manifest
 *        entry (see getOneKeyrackAwsParamOrgProfile). the manifest is owner-scoped
 *        (keyrack.host.{owner}.age), so a fixture converted at owner=null is invisible to a
 *        `--owner {owner}` set. this writes the peer entry into the SAME owner manifest the set
 *        reads, so a specific-org github-app / replica persist resolves its identity instead of
 *        a fail-loud
 *
 * .note = the aws.config vault + EPHEMERAL_VIA_AWS_SSO mech match how a real org declares its
 *         profile; only the exid (the profile name) is read by the identity resolver
 * .note = writes the manifest fresh — call BEFORE any `keyrack set` for this owner so the set
 *         findsert-appends its own key into this manifest
 */
export const seedHostManifestAwsProfile = async (input: {
  repoPath: string;
  owner: string;
  org: string;
  env: string;
  profile: string;
}): Promise<void> =>
  seedHostManifestEntries({
    repoPath: input.repoPath,
    owner: input.owner,
    entries: [
      {
        slug: `${input.org}.${input.env}.AWS_PROFILE`,
        vault: 'aws.config',
        mech: 'EPHEMERAL_VIA_AWS_SSO',
        exid: input.profile,
        env: input.env,
        org: input.org,
        meta: null,
      },
    ],
  });
