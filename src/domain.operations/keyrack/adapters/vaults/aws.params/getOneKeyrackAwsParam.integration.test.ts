import { genLogMethods } from 'sdk-logs';
import { given, then, useBeforeAll, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { useKeyrack } from '@src/.test/infra/useKeyrack';

import { asContextAwsApi } from './asContextAwsApi';
import { getOneDeclastructAws } from './getOneDeclastructAws';
import { getOneKeyrackAwsParam } from './getOneKeyrackAwsParam';

/**
 * .what = integration tests for getOneKeyrackAwsParam (the raw SSM read seam)
 *
 * .why = prove a REAL decrypt of an SSM SecureString via declastruct-aws:
 *   - the test provisions its OWN param via the write seam (sdkSsm.setParameter),
 *     reads it back with decryption, asserts the value + type, then tears it down
 *   - no fixture is "placed out-of-band" — the roundtrip is self-contained
 *   - uses the AWS-managed default SSM key (alias/aws/ssm), so no custom KMS grant
 *
 * .scope = internal communicator (NOT a user-faced contract)
 *
 * .creds = jest.integration.env.ts sources AWS_PROFILE from keyrack into process.env.
 *   BUT the AWS SDK v3, given an SSO profile, lazily `import()`s its SSO provider —
 *   and jest's default (non-vm-modules) runtime rejects that dynamic import. so this
 *   suite exports the SSO session as STATIC temporary credentials (via `aws configure
 *   export-credentials`) and drops AWS_PROFILE, so the SDK uses the synchronous env
 *   provider — no dynamic import, a real backend, no mock. this is the same handoff CI
 *   performs with a role. region is supplied explicitly (us-east-1) because the SDK does
 *   NOT auto-derive region from the ambient chain (q5)
 */
const REGION = 'us-east-1';

describe('getOneKeyrackAwsParam integration', () => {
  // acquire a live AWS identity as STATIC env creds (the shared SSO-vend helper) so the AWS
  // SDK uses the synchronous env provider — no SSO dynamic import that jest's runtime rejects
  beforeAll(() => useKeyrack());

  given('[case1] a SecureString param provisioned by the test itself', () => {
    // a unique name per run so parallel runs never collide; legal SSM charset only
    const name = `/keyrack/infra/vault/aws.params/v1/_test/ehmpathy/test/PROBE_${getUuid()}`;
    const secret = `probe-secret-${getUuid()}`;

    const scene = useBeforeAll(async () => {
      const declastruct = await getOneDeclastructAws();
      const context = {
        ...asContextAwsApi({ region: REGION }),
        log: genLogMethods(),
      };
      // provision: write the SecureString the read path will decrypt
      await declastruct.sdkSsm.setParameter(
        { name, value: secret, type: 'SecureString', overwrite: true },
        context,
      );
      return { declastruct, context };
    });

    afterAll(async () => {
      // teardown: delete the param the test provisioned (idempotent — safe if absent).
      // re-acquire the seams LOCALLY so teardown never depends on the deferred scene
      // proxy — a destructure of the proxy could read undefined and silently leak the
      // param, so the cleanup owns its own declastruct + context
      const declastruct = await getOneDeclastructAws();
      const context = {
        ...asContextAwsApi({ region: REGION }),
        log: genLogMethods(),
      };
      await declastruct.sdkSsm.delParameter({ name }, context);
    });

    when('[t0] getOneKeyrackAwsParam reads the param', () => {
      const read = useBeforeAll(async () => ({
        param: await getOneKeyrackAwsParam(
          {
            exid: name,
            region: REGION,
            credsEnv: { AWS_PROFILE: undefined },
            endpoint: null,
          },
          { declastruct: scene.declastruct },
        ),
      }));

      then('it returns the decrypted value', () => {
        expect(read.param).not.toBeNull();
        expect(read.param!.value).toEqual(secret);
      });

      then('it reports the type as SecureString', () => {
        expect(read.param!.type).toEqual('SecureString');
      });
    });
  });

  given('[case2] a param that does not exist', () => {
    const name = `/keyrack/infra/vault/aws.params/v1/_test/ehmpathy/test/ABSENT_${getUuid()}`;

    when('[t0] getOneKeyrackAwsParam reads the absent param', () => {
      then('it returns null (ParameterNotFound → null)', async () => {
        const declastruct = await getOneDeclastructAws();
        const result = await getOneKeyrackAwsParam(
          {
            exid: name,
            region: REGION,
            credsEnv: { AWS_PROFILE: undefined },
            endpoint: null,
          },
          { declastruct },
        );
        expect(result).toBeNull();
      });
    });
  });
});
