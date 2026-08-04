import { genLogMethods } from 'sdk-logs';

import { asContextAwsApi } from './asContextAwsApi';
import { asKeyrackAwsParamErrorGate } from './asKeyrackAwsParamErrorGate';
import type { DeclastructAws } from './getOneDeclastructAws';
import { isAwsSdkError } from './isAwsSdkError';
import { withKeyrackAwsParamEnvOverlay } from './withKeyrackAwsParamEnvOverlay';

/**
 * .what = fetch + decrypt one SSM SecureString via declastruct, translate any raw AWS boundary
 *         error into a classed keyrack error that names the fix (gates 2/4/7)
 * .why = a raw sdk denial must never reach the caller bare; this is the single seam where an AWS
 *        denial becomes a keyrack unlock gate
 */
export const getOneKeyrackAwsParam = async (
  input: {
    exid: string;
    region: string;
    // the org-scope identity overlay: AWS_PROFILE set to the org's declared profile, or
    // undefined to clear it so the default chain derives the grove's IMDS role (@all)
    credsEnv: { AWS_PROFILE: string | undefined };
    // the optional SSM endpoint: null in prod (the SDK derives the real AWS endpoint), or a
    // local emulator URL under test. threaded so the acceptance/journey harness can point the
    // real SSMClient at the emulator (a real backend swap, not a mock)
    endpoint: string | null;
  },
  context: { declastruct: DeclastructAws },
): Promise<{ value: string; type: string } | null> => {
  // the identity + endpoint overlays (AWS_PROFILE selects the org-scope identity;
  // AWS_ENDPOINT_URL_SSM redirects to the emulator under test) are applied around the SDK call by
  // the shared HOF, which restores both in a finally even on throw — the read + the github-app
  // write share it, so the scoped save→set→restore has one home. the source
  // getOneKeyrackAwsParamEndpoint already gated the endpoint to NODE_ENV==='test', so a null here
  // in prod means no override can ever be applied
  try {
    const result = await withKeyrackAwsParamEnvOverlay(
      { awsProfile: input.credsEnv.AWS_PROFILE, endpoint: input.endpoint },
      async () =>
        // raw i/o: WithDecryption:true → the decrypted value, or null on ParameterNotFound
        context.declastruct.sdkSsm.getOneParameter(
          { name: input.exid, withDecryption: true },
          {
            ...asContextAwsApi({ region: input.region }),
            log: genLogMethods(),
          },
        ),
    );
    return result && { value: result.value, type: result.type };
  } catch (cause) {
    // allowlist boundary (rule.forbid.failhide): ONLY a recognized AWS SDK error is classified
    // into a keyrack gate; every other cause — a native code bug, a foreign lib error, any
    // unexpected fault — is NOT an AWS error, so it rethrows UNCHANGED with its own type + stack
    if (!isAwsSdkError(cause)) throw cause;
    // classify the raw AWS error into the keyrack gate it represents; never a bare sdk error
    throw asKeyrackAwsParamErrorGate({
      cause,
      exid: input.exid,
      region: input.region,
    });
  }
};
