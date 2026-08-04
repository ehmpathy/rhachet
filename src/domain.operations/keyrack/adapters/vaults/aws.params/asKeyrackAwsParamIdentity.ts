import { ConstraintError } from 'helpful-errors';

/**
 * .what = the AWS identity an aws.params key authenticates as — the resolved answer to the
 *         --org hardcut ("who reads/writes this key's SSM param?"). total + unambiguous:
 *         - imds    → the grove's own instance role (an @all, machine-wide key)
 *         - profile → a specific org's keyrack-declared AWS_PROFILE (a tree-scoped key)
 * .why = this is the domain concept every aws.params op (get/set/del) actually needs. it is
 *        NOT the bare profile name (a mechanism, and null-overloaded between "@all → imds" and
 *        "org with no profile"): the source discriminant carries the intent, so no call site has
 *        to re-derive org to interpret it. named `KeyrackAwsParamIdentity` (never bare `identity`,
 *        which the vault-adapter contract already uses for the os.secure ssh/age identity)
 */
export type KeyrackAwsParamIdentity =
  | { source: 'imds' }
  | { source: 'profile'; profile: string };

/**
 * .what = decide WHICH aws identity unlocks an aws.params key, from the --org scope (the hardcut)
 * .why = a grove can reach many aws identities; the --org scope the human already typed decides
 *        which one, deterministically — never an inference waterfall, never a picker
 *        (see .agent/repo=.this/role=keyrack/briefs/define.keyrack-org-scope.grove-vs-tree.md)
 *
 * .note = @all → grove-wide → the grove's own ambient identity (IMDS only, never a profile,
 *         never ambient SSO). a specific org → tree-wide → that org's AWS_PROFILE (looked up
 *         from the keyrack itself and passed in as profileForOrg); absent → fail loud + guide
 */
export const asKeyrackAwsParamIdentity = (input: {
  org: string;
  profileForOrg: string | null;
}): KeyrackAwsParamIdentity => {
  // @all = grove-wide → the grove's own ambient identity (IMDS); never a profile, never SSO
  if (input.org === '@all') return { source: 'imds' };

  // a specific org = tree-wide → that org's AWS_PROFILE from the keyrack itself
  if (input.profileForOrg)
    return { source: 'profile', profile: input.profileForOrg };

  // a specific org with no declared AWS_PROFILE → fail loud, name the fix (never fall to IMDS)
  return ConstraintError.throw(
    `aws.params: no AWS_PROFILE declared for org "${input.org}"`,
    {
      org: input.org,
      hint: `this key is tree-scoped, so it authenticates as org "${input.org}"'s identity — the AWS_PROFILE this keyrack manages for that org. declare an AWS_PROFILE key for this org (env), or re-set the key with --org @all to use the grove's own identity.`,
    },
  );
};
