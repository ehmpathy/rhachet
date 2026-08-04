/**
 * .what = map an aws.params identity to the process.env overlay that selects it for the SDK
 * .why = declastruct builds the SSMClient with region only, so keyrack selects the identity via
 *        the environment: a specific-org key sets AWS_PROFILE to the org's keyrack-declared
 *        profile; an @all (grove-wide) key clears AWS_PROFILE so the default chain derives the
 *        grove's own IMDS role
 *
 * .note = the value is a DELIBERATE designation from the keyrack (the org's declared profile),
 *         never an ambient grab — a cleared AWS_PROFILE for @all likewise refuses any stray
 *         profile so IMDS is the identity
 * .note = `undefined` means "delete this key from the env before the call" (see the applier)
 */
export const asKeyrackAwsParamCredsEnv = (input: {
  identity: { source: 'imds' } | { source: 'profile'; profile: string };
}): { AWS_PROFILE: string | undefined } => {
  // @all → IMDS: clear AWS_PROFILE so no profile hijacks the grove's own ambient identity
  if (input.identity.source === 'imds') return { AWS_PROFILE: undefined };

  // a specific org → authenticate as that org's keyrack-declared profile
  return { AWS_PROFILE: input.identity.profile };
};
