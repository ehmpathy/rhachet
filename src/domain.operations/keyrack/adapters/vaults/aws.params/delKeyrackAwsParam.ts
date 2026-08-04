import { MalfunctionError } from 'helpful-errors';
import { genLogMethods } from 'sdk-logs';

import { asKeyrackSlugParts } from '@src/domain.operations/keyrack/asKeyrackSlugParts';

import { asContextAwsApi } from './asContextAwsApi';
import { asKeyrackAwsParamCredsEnv } from './asKeyrackAwsParamCredsEnv';
import type { KeyrackAwsParamIdentity } from './asKeyrackAwsParamIdentity';
import { asKeyrackAwsParamName } from './asKeyrackAwsParamName';
import { getOneDeclastructAws } from './getOneDeclastructAws';
import { getOneKeyrackAwsParamEndpoint } from './getOneKeyrackAwsParamEndpoint';
import { isAwsSdkError } from './isAwsSdkError';
import { withKeyrackAwsParamEnvOverlay } from './withKeyrackAwsParamEnvOverlay';

/**
 * .what = destroy the SSM param keyrack manages for this key (its computed-namespace name)
 * .why = keyrack destroys what it created — a key removed from the manifest should not strand
 *        its secret in SSM
 *
 * .note = it targets the COMPUTED-namespace name only (asKeyrackAwsParamName). a key set with a
 *         foreign explicit --exid (an out-of-band / shared param, e.g. u4) resolves to a
 *         DIFFERENT name here, so the destroy is a no-op against that computed path and the
 *         operator's out-of-band param is never touched
 * .note = idempotent — declastruct's delSsmParameterSecure is a no-op if the param is absent,
 *         and type-guarded (it refuses a non-SecureString), so a repurposed plaintext is safe
 */
export const delKeyrackAwsParam = async (input: {
  slug: string;
  owner: string;
  region: string;
  // the resolved AWS identity the destroy authenticates as (the --org hardcut). resolved by the
  // vault adapter from the host manifest + slug, so this leaf never decides it
  identity: KeyrackAwsParamIdentity;
}): Promise<{ name: string }> => {
  // compute the keyrack-managed param name — the same template set wrote to
  const { org, env, keyName } = asKeyrackSlugParts({ slug: input.slug });
  const name = asKeyrackAwsParamName({
    owner: input.owner,
    org,
    env,
    key: keyName,
  });

  // project the resolved org-scope identity to the AWS_PROFILE overlay the destroy runs under — the
  // SAME --org hardcut set + read use: a specific org's declared profile, or cleared for @all's
  // IMDS role. NEVER the machine's ambient AWS_PROFILE — a scoped-org del acts as the org identity
  const { AWS_PROFILE: awsProfileForDel } = asKeyrackAwsParamCredsEnv({
    identity: input.identity,
  });

  // destroy via declastruct's idempotent, type-guarded delete (no-op if absent).
  // .note = declastruct builds the SSMClient with region only, so the AWS-native env overlay is the
  //         one seam that reaches the client (AWS_ENDPOINT_URL_SSM redirects to the emulator under
  //         test; null → real AWS in prod). AWS_PROFILE is set to the org's resolved identity (a
  //         specific org's declared profile, or cleared for @all's IMDS role) — the SAME org-scope
  //         hardcut set + read use; see define.keyrack-org-scope.grove-vs-tree.md
  const declastruct = await getOneDeclastructAws();
  const endpoint = getOneKeyrackAwsParamEndpoint();
  try {
    await withKeyrackAwsParamEnvOverlay(
      { awsProfile: awsProfileForDel, endpoint },
      async () =>
        declastruct.delSsmParameterSecure(
          { by: { unique: { name } } },
          {
            ...asContextAwsApi({ region: input.region }),
            log: genLogMethods(),
          },
        ),
    );
  } catch (cause) {
    // allowlist boundary (rule.forbid.failhide): ONLY a recognized AWS SDK error is classified;
    // every other cause — a native code bug, a foreign lib error, any unexpected fault — is NOT
    // an AWS error, so it rethrows UNCHANGED with its own type + stack, never a keyrack wrap
    if (!isAwsSdkError(cause)) throw cause;
    throw new MalfunctionError(
      'aws.params del: failed to destroy the SSM param',
      {
        name,
        region: input.region,
        hint: 'confirm ssm:DeleteParameter (+ kms:Decrypt for the type-check) on the identity',
        cause: cause instanceof Error ? cause : undefined,
      },
    );
  }

  // return the destroyed param name so the caller can echo what changed (status feedback)
  return { name };
};
