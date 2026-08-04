import { MalfunctionError } from 'helpful-errors';
import { genLogMethods } from 'sdk-logs';

import type { KeyrackMechAcquireOptions } from '@src/domain.objects/keyrack';
import { mechAdapterReplica } from '@src/domain.operations/keyrack/adapters/mechanisms/mechAdapterReplica';

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
 * .what = persist a static secret (a replica keyrack owns) into SSM at exid, then verify it reads
 *         back — the PERMANENT_VIA_REPLICA twin of setKeyrackAwsParamGithubApp
 * .why = replica and reference share the SAME get path (a passthrough of the decrypted SSM value),
 *        and differ ONLY at set: reference points at an out-of-band param (writes no value),
 *        replica writes a copy keyrack owns. so aws.params supports both — the mech is orthogonal
 *        to the vault. this owns-secret write mirrors the github-app blob write: acquire → persist
 *        → roundtrip-verify, so a broken write/grant fails loud at SET, not later at unlock
 */
export const setKeyrackAwsParamReplica = async (
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
    // .note = the i/o boundaries are injectable via context.deps so a unit test observes the
    //         identity wire-through with lightweight fakes (no jest.mock of remote boundaries,
    //         per rule.forbid.unit.remote-boundaries). prod passes no deps → the real imports apply
    deps?: {
      acquireForSet?: typeof mechAdapterReplica.acquireForSet;
      getOneDeclastructAws?: typeof getOneDeclastructAws;
      getOneKeyrackAwsParamEndpoint?: typeof getOneKeyrackAwsParamEndpoint;
      getOneKeyrackAwsParam?: typeof getOneKeyrackAwsParam;
    };
  },
): Promise<{
  mech: 'PERMANENT_VIA_REPLICA';
  exid: string;
  meta: { region: string };
}> => {
  // derive each i/o boundary from its injected fake (tests) or the real import (prod)
  const acquireForSet =
    context?.deps?.acquireForSet ?? mechAdapterReplica.acquireForSet;
  const getOneDeclastructAwsFn =
    context?.deps?.getOneDeclastructAws ?? getOneDeclastructAws;
  const getOneKeyrackAwsParamEndpointFn =
    context?.deps?.getOneKeyrackAwsParamEndpoint ??
    getOneKeyrackAwsParamEndpoint;
  const getOneKeyrackAwsParamFn =
    context?.deps?.getOneKeyrackAwsParam ?? getOneKeyrackAwsParam;

  // emit the guided-setup header so the wizard tree anchors under a 🔐 glyph — the SAME header
  // os.secure / 1password print before their guided setup, so the aws.params replica wizard renders
  // as one coherent, header-anchored tree
  console.log(`🔐 keyrack set ${input.slug} via PERMANENT_VIA_REPLICA`);

  // acquire the static secret via the replica mech's guided setup (a hidden stdin prompt).
  // .note = context.mech injects the prompt source (composition root / tests) so this owned-secret
  //         path is reachable headlessly; absent in prod, the mech falls back to the real terminal
  const { source: secret } = await acquireForSet(
    { keySlug: input.slug },
    context?.mech,
  );
  const declastruct = await getOneDeclastructAwsFn();

  // the optional SSM endpoint — the SAME shared source the read path uses, so persist + read cannot
  // drift (null in prod; a local emulator URL under test)
  const endpoint = getOneKeyrackAwsParamEndpointFn();

  // project the resolved org-scope identity to the AWS_PROFILE overlay the write + roundtrip-verify
  // both run under — the --org hardcut: a specific org's declared profile, or cleared for @all's
  // IMDS role. NEVER the machine's ambient AWS_PROFILE — the human need not export one
  const { AWS_PROFILE: awsProfileAtSet } = asKeyrackAwsParamCredsEnv({
    identity: input.identity,
  });

  // persist via the public setSsmParameterSecure DAO — an idempotent upsert that OVERWRITES the
  // value at this path, so a re-set is a deliberate re-persist / rotation, NOT an error. a write
  // denial (PutParameter / kms:Encrypt) is classed via the same gate seam, never a bare sdk error
  try {
    await withKeyrackAwsParamEnvOverlay(
      { awsProfile: awsProfileAtSet, endpoint },
      async () =>
        declastruct.setSsmParameterSecure(
          {
            upsert: new declastruct.DeclaredAwsSsmParameterSecure({
              name: input.exid,
              value: secret,
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
    // allowlist boundary (rule.forbid.failhide): ONLY a recognized AWS SDK error is classified into
    // a keyrack gate; every other cause rethrows UNCHANGED with its own type + stack
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

  // roundtrip-verify: read the value back with decryption right after the write, under the SAME
  // org-scope identity, so a broken write/grant fails loud at SET, not later at unlock
  const readback = await getOneKeyrackAwsParamFn(
    {
      exid: input.exid,
      region: input.region,
      credsEnv: { AWS_PROFILE: awsProfileAtSet },
      endpoint,
    },
    { declastruct },
  );
  const defect = asKeyrackAwsParamRoundtripDefect({
    written: secret,
    readback,
    exid: input.exid,
  });
  if (defect)
    MalfunctionError.throw(defect.message, {
      exid: input.exid,
      hint: defect.hint,
    });

  return {
    mech: 'PERMANENT_VIA_REPLICA',
    exid: input.exid,
    meta: { region: input.region },
  };
};
