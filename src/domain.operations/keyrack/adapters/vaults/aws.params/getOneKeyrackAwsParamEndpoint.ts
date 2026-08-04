/**
 * .what = read the optional SSM endpoint override, the ONE source shared by the read and the
 *         github-app persist paths — HONORED ONLY under an explicit test signal
 * .why  = two independent inline env reads could silently diverge (a rename, a second source); one
 *         communicator guarantees both sites read the identical value. AND the override is a
 *         redirect of where the SSMClient talks — which covers the write that persists a github-app
 *         private key — so a bare env read would be a credential-exfil/poison vector if the var ever
 *         leaked into a prod/grove env (a stale .env, a shared CI image). the test GATE makes the
 *         override structurally UNREACHABLE from a prod process (rule.require.safe-by-default)
 *
 * .note = the endpoint reaches the SDK-built SSMClient via the AWS-native `AWS_ENDPOINT_URL_SSM`
 *         env var (honored by @aws-sdk/client-ssm), overlaid scoped around the SSM call — the same
 *         save→set→restore seam the read path already uses for `AWS_PROFILE`. declastruct-aws 1.10.1
 *         builds `new SSMClient({ region })` with NO endpoint field on ContextAwsApi, so the env
 *         overlay is the ONE seam that reaches the client — a documented divergence from the
 *         blueprint's original `context.aws.endpoint` intent (which the read path never receives a
 *         context for; see asContextAwsApi.ts)
 */
export const getOneKeyrackAwsParamEndpoint = (): string | null => {
  // GATE: the endpoint override is a REDIRECT of the SSMClient host — honored ONLY when the process
  // is explicitly a test process (NODE_ENV === 'test'; jest/the acceptance harness sets this). in a
  // prod/grove process this returns null NO MATTER what the env var holds, so a leaked
  // KEYRACK_AWS_SSM_ENDPOINT can NEVER redirect a real SSM read/write — the override is unreachable
  // from prod by construction, not by trust. the ONE injection point the acceptance/journey harness
  // uses to point the real SSMClient at a local SSM emulator (a real backend swap, not a mock —
  // rule.forbid.acceptance.mocks holds). there is no CLI flag; prod never sets it AND could not use
  // it if it did.
  if (process.env.NODE_ENV !== 'test') return null;
  return process.env.KEYRACK_AWS_SSM_ENDPOINT ?? null;
};
