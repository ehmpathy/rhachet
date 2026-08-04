/**
 * .what = run fn with the two AWS env overlays applied, then restore the prior values in finally
 * .why = declastruct builds the SSMClient with region only, so the ambient env is the one seam
 *        that reaches the client: AWS_PROFILE selects the org-scope identity (the specific-org
 *        hardcut), AWS_ENDPOINT_URL_SSM (the AWS SDK's own var) redirects the host to the emulator
 *        under test. the read and the github-app write BOTH need this scoped save→set→restore, so
 *        it lives in one HOF — no hand-rolled copy per caller (rule.prefer.wet-over-dry, the 3rd
 *        caller threshold), and the overlay is unit-testable on its own instead of only through a
 *        real SSM round-trip
 *
 * .note = deliberate scoped mutation of process.env: unlockKeyrackKeys drives keys sequentially,
 *         so this save→set→restore never races a concurrent read/write. the finally restores even
 *         when fn throws, so an overlay never leaks past one call (a leaked AWS_PROFILE would
 *         mis-scope the NEXT key's identity)
 */
export const withKeyrackAwsParamEnvOverlay = async <T>(
  input: {
    // the identity overlay: a profile name selects the org's declared identity; undefined clears
    // AWS_PROFILE so the SDK default chain derives the grove's IMDS role (@all)
    awsProfile: string | undefined;
    // the endpoint overlay: a URL points the SSMClient at the emulator; null leaves the SDK to
    // derive the real AWS endpoint (prod)
    endpoint: string | null;
  },
  fn: () => Promise<T>,
): Promise<T> => {
  const priorProfile = process.env.AWS_PROFILE;
  const priorEndpoint = process.env.AWS_ENDPOINT_URL_SSM;
  try {
    if (input.awsProfile === undefined) delete process.env.AWS_PROFILE;
    else process.env.AWS_PROFILE = input.awsProfile;

    if (input.endpoint === null) delete process.env.AWS_ENDPOINT_URL_SSM;
    else process.env.AWS_ENDPOINT_URL_SSM = input.endpoint;

    return await fn();
  } finally {
    // restore both prior overlays so neither leaks past this one call
    if (priorProfile === undefined) delete process.env.AWS_PROFILE;
    else process.env.AWS_PROFILE = priorProfile;
    if (priorEndpoint === undefined) delete process.env.AWS_ENDPOINT_URL_SSM;
    else process.env.AWS_ENDPOINT_URL_SSM = priorEndpoint;
  }
};
