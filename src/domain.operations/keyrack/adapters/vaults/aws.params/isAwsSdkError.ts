/**
 * .what = assess whether a caught cause is an AWS SDK error the aws.params catch is allowed to
 *         classify into a keyrack gate (a service exception, or a credential-chain error)
 * .why = rule.forbid.failhide requires an EXPLICIT allowlist of the errors a catch handles, and a
 *        rethrow-UNCHANGED for every error outside it. this is that allowlist: only a recognized
 *        AWS SDK error is classified by asKeyrackAwsParamErrorGate; a native code bug, a foreign
 *        lib error, or any other unexpected fault is NOT an AWS error, so the catch rethrows it
 *        intact (its own type + stack survive, never reclassified). one predicate all three
 *        aws.params catch sites share (getOneKeyrackAwsParam, setKeyrackAwsParamGithubApp,
 *        delKeyrackAwsParam)
 *
 * .note = AWS SDK v3 service exceptions all extend ServiceException, which carries `$metadata`
 *         (and usually `$fault`); credential-chain errors (thrown before any HTTP call, so they
 *         carry no `$metadata`) are matched by their `.name` instead
 */
export const isAwsSdkError = (cause: unknown): boolean => {
  if (!(cause instanceof Error)) return false;

  // a service exception — every AWS SDK v3 service error carries the structured $metadata bag,
  // and client/server faults additionally carry $fault
  if ('$metadata' in cause || '$fault' in cause) return true;

  // a service exception name (defensive — an SDK error whose $metadata was stripped in transit)
  if (cause.name.endsWith('Exception')) return true;

  // a credential-chain error — thrown by the SDK's provider chain BEFORE any HTTP call (so no
  // $metadata), when no ambient identity can be derived. gate 2 classifies these into "no AWS
  // identity", so they are part of the allowlist
  return (
    cause.name === 'CredentialsProviderError' ||
    cause.name === 'ProviderError' ||
    cause.name === 'TokenProviderError'
  );
};
