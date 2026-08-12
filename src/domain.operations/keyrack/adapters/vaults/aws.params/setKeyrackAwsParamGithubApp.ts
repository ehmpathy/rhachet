import { MalfunctionError } from 'helpful-errors';
import { genLogMethods } from 'sdk-logs';

import type { KeyrackMechAcquireOptions } from '@src/domain.objects/keyrack';
import { mechAdapterGithubApp } from '@src/domain.operations/keyrack/adapters/mechanisms/mechAdapterGithubApp';

import { asContextAwsApi } from './asContextAwsApi';
import { asKeyrackAwsParamCredsEnv } from './asKeyrackAwsParamCredsEnv';
import { asKeyrackAwsParamErrorGate } from './asKeyrackAwsParamErrorGate';
import type { KeyrackAwsParamIdentity } from './asKeyrackAwsParamIdentity';
import { asKeyrackAwsParamRoundtripDefect } from './asKeyrackAwsParamRoundtripDefect';
import { getOneDeclastructAws } from './getOneDeclastructAws';
import { getOneKeyrackAwsParam } from './getOneKeyrackAwsParam';
import { getOneKeyrackAwsParamEndpoint } from './getOneKeyrackAwsParamEndpoint';
import { isAwsSdkError } from './isAwsSdkError';
import { withKeyrackAwsParamEnvOverlay } from './withKeyrackAwsParamEnvOverlay';

/**
 * .what = persist a github-app credential blob into SSM at exid, then verify it read back
 * .why = keep set()'s switch a narrative dispatcher; own the owned-mech write + its overwrite
 *        semantics + the roundtrip verify in one testable place
 */
export const setKeyrackAwsParamGithubApp = async (
  input: {
    slug: string;
    exid: string;
    region: string;
    // the resolved AWS identity the write + roundtrip-verify authenticate as (the --org hardcut).
    // resolved once by the vault adapter from the host manifest + slug, so this leaf never decides it
    identity: KeyrackAwsParamIdentity;
  },
  context?: {
    mech?: KeyrackMechAcquireOptions;
    // .note = the four i/o boundaries are injectable via context.deps so a unit test observes the
    //         identity wire-through with lightweight fakes (no jest.mock of remote boundaries, per
    //         rule.forbid.unit.remote-boundaries). prod passes no deps → the real imports apply
    deps?: {
      acquireForSet?: typeof mechAdapterGithubApp.acquireForSet;
      getOneDeclastructAws?: typeof getOneDeclastructAws;
      getOneKeyrackAwsParamEndpoint?: typeof getOneKeyrackAwsParamEndpoint;
      getOneKeyrackAwsParam?: typeof getOneKeyrackAwsParam;
    };
  },
): Promise<{
  mech: 'EPHEMERAL_VIA_GITHUB_APP';
  exid: string;
  meta: { region: string };
}> => {
  // derive each i/o boundary from its injected fake (tests) or the real import (prod). the pure
  // transformers (asContextAwsApi, error-gate, roundtrip-defect, isAwsSdkError) and the real env
  // overlay are never injected — the unit observes ONLY the identity wire-through
  const acquireForSet =
    context?.deps?.acquireForSet ?? mechAdapterGithubApp.acquireForSet;
  const getOneDeclastructAwsFn =
    context?.deps?.getOneDeclastructAws ?? getOneDeclastructAws;
  const getOneKeyrackAwsParamEndpointFn =
    context?.deps?.getOneKeyrackAwsParamEndpoint ??
    getOneKeyrackAwsParamEndpoint;
  const getOneKeyrackAwsParamFn =
    context?.deps?.getOneKeyrackAwsParam ?? getOneKeyrackAwsParam;

  // emit the guided-setup header so the wizard tree is anchored under a 🔐 glyph — the SAME header
  // os.secure / 1password / github.secrets print before their github-app guided setup (e.g.
  // vaultAdapterOsSecure emits `🔐 keyrack set ${slug} via ${mech}`), so the aws.params owned-secret
  // wizard renders as one coherent, header-anchored tree. without it the app-selection + pem prompts
  // trail with no lead glyph, and a snapshot trimmed to the first glyph captures only the compact
  // confirmation — the guided wizard falls out of the user-faced contract capture
  console.log(`🔐 keyrack set ${input.slug} via EPHEMERAL_VIA_GITHUB_APP`);

  // load the declastruct-aws peer BEFORE the guided setup — an absent peer is a pre-knowable gate
  // (its module-not-found does not depend on the acquired blob), so it must fail loud NOW rather
  // than after the human walks the app-selection + pem prompts only to be rejected (req4,
  // never-waste-user-time)
  const declastruct = await getOneDeclastructAwsFn();

  // acquire the blob via the mech's guided setup.
  // .note = context.mech injects the gh runner + prompt (composition root / tests) so this
  //         owned-secret path is reachable headlessly; absent in prod, the mech falls back to
  //         the real gh cli + terminal (mirrors os.secure)
  // .note = `mech` is REQUIRED so the adapter names the identity that invoked it rather than a
  //         guess; this arm is the github-app one by construction
  // .note = no `reach` is threaded, deliberately. the github-app mech DOES read a reach (it
  //         derives the target org's installation from one), but aws.params is UNADDRESSABLE, so
  //         the vault refused any reach at its boundary before this call. the mech keeps its
  //         reach facet for the vaults that can file one
  const { source: blob } = await acquireForSet(
    { keySlug: input.slug, mech: 'EPHEMERAL_VIA_GITHUB_APP' },
    context?.mech,
  );

  // the optional SSM endpoint — the SAME shared source the read path uses, so the persist and the
  // read cannot drift (null in prod; a local emulator URL under test). declastruct builds the
  // SSMClient with region only, so the AWS-native AWS_ENDPOINT_URL_SSM env overlay is the one seam
  // that reaches the client for the write — same scoped save→set→restore the read path uses
  const endpoint = getOneKeyrackAwsParamEndpointFn();

  // project the resolved org-scope identity to the AWS_PROFILE overlay the write + roundtrip-verify
  // both run under. the --org hardcut governs the write exactly as the read: a specific org's
  // declared profile, or cleared for @all's IMDS role — NEVER the machine's ambient AWS_PROFILE, so
  // the human need not export one (see define.keyrack-org-scope.grove-vs-tree.md → ".how it applies
  // to set / del"). one resolved overlay keeps the write and its verify on one identity
  const { AWS_PROFILE: awsProfileAtSet } = asKeyrackAwsParamCredsEnv({
    identity: input.identity,
  });

  // persist via the public setSsmParameterSecure DAO (the vision's required persist path for
  // owned-source mechs) — an idempotent upsert that OVERWRITES the blob at this path, so a re-set
  // is a deliberate re-persist / rotation, NOT an error. a write denial (PutParameter /
  // kms:Encrypt) is classed via the same gate seam, never a bare sdk error.
  // the endpoint overlay (emulator redirect under test; null → real AWS in prod) is applied by the
  // SAME shared HOF the read path uses, so the two cannot drift. AWS_PROFILE is set to the org's
  // resolved identity (a specific org's declared profile, or cleared for @all's IMDS role)
  try {
    await withKeyrackAwsParamEnvOverlay(
      { awsProfile: awsProfileAtSet, endpoint },
      async () =>
        declastruct.setSsmParameterSecure(
          {
            upsert: new declastruct.DeclaredAwsSsmParameterSecure({
              name: input.exid,
              value: blob,
              keyId: null,
              description: null,
              tags: null,
            }),
          },
          {
            ...asContextAwsApi({ region: input.region }),
            log: genLogMethods(),
          },
        ),
    );
  } catch (cause) {
    // allowlist boundary (rule.forbid.failhide): ONLY a recognized AWS SDK error is classified
    // into a keyrack gate; every other cause — a native code bug, a foreign lib error, any
    // unexpected fault — is NOT an AWS error, so it rethrows UNCHANGED with its own type + stack
    if (!isAwsSdkError(cause)) throw cause;
    throw asKeyrackAwsParamErrorGate(
      {
        cause,
        exid: input.exid,
        region: input.region,
      },
      { op: 'write' },
    );
  }

  // roundtrip-verify: read the blob back with decryption right after the write, so a broken
  // write/grant fails loud at SET, not later at unlock.
  // .note = the read-back passes the SAME org-scope identity (awsProfileAtSet) the write above
  //         used, so the verify proves THAT identity — the org's declared profile, or @all's IMDS
  //         role — can read the blob back. write and verify MUST share one identity: a divergent
  //         read-back would prove the wrong principal (a false negative when the write identity
  //         lacks Get/Decrypt, a false positive when the read identity is more privileged)
  const readback = await getOneKeyrackAwsParamFn(
    {
      exid: input.exid,
      region: input.region,
      credsEnv: { AWS_PROFILE: awsProfileAtSet },
      // the readback rides the SAME endpoint as the write above, so a roundtrip-verify against the
      // emulator reads back from the emulator (never a real-SSM read of an emulator-written blob)
      endpoint,
    },
    { declastruct },
  );
  const defect = asKeyrackAwsParamRoundtripDefect({
    written: blob,
    readback,
    exid: input.exid,
  });
  if (defect)
    MalfunctionError.throw(defect.message, {
      exid: input.exid,
      hint: defect.hint,
    });

  return {
    mech: 'EPHEMERAL_VIA_GITHUB_APP',
    exid: input.exid,
    meta: { region: input.region },
  };
};
