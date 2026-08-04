import { genLogMethods } from 'sdk-logs';
import { getError, given, then, useBeforeAll, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { useKeyrack } from '@src/.test/infra/useKeyrack';

import { asContextAwsApi } from './asContextAwsApi';
import { getOneDeclastructAws } from './getOneDeclastructAws';
import { vaultAdapterAwsParams } from './vaultAdapterAwsParams';

/**
 * .what = integration tests for vaultAdapterAwsParams (the grove read path)
 *
 * .why = prove the unlock -> get -> KeyrackKeyGrant flow end-to-end against REAL SSM:
 *   - the test provisions its OWN SecureString via the write seam, then drives the
 *     adapter's unlock (prechecks) + get (SSM decrypt -> grant) exactly as
 *     unlockKeyrackKeys does on a grove; then tears the param down
 *   - also exercises the fail-loud gates against real SSM: absent param (gate 5)
 *     and a plaintext String (gate 6)
 *
 * .scope = internal vault adapter (NOT a user-faced contract)
 *
 * .creds = the SSO session is re-vended THROUGH keyrack (the aws.whoami sequence),
 *   then exported as STATIC env creds, so the AWS SDK uses the synchronous env
 *   provider (an SSO profile makes the SDK lazily import(), which jest rejects).
 *   region supplied explicitly (us-east-1) — the SDK does NOT auto-derive it (q5)
 *
 * .scope-note = these keys are `@all` (grove-wide): the org-scope hardcut maps @all to the
 *   machine's OWN ambient identity — exactly the static env creds vended here, with NO
 *   AWS_PROFILE overlay. a specific-org read needs a peer AWS_PROFILE threaded by the batch; a
 *   direct adapter.get() does not run the batch's peer-profile read, so the specific-org path is
 *   proven by its own targeted unit clamps instead: the hardcut decision
 *   (asKeyrackAwsParamIdentity.test — @all→imds, specific-org→profile, no-profile→failfast), the
 *   peer-manifest AWS_PROFILE lookup (getOneKeyrackAwsParamOrgProfile.test), and the AWS_PROFILE
 *   env overlay that carries the chosen identity to the SDK (withKeyrackAwsParamEnvOverlay.test —
 *   profile set while the read runs, restored after)
 */
const REGION = 'us-east-1';
const META = { region: REGION };

describe('vaultAdapterAwsParams integration', () => {
  // acquire a live AWS identity as STATIC env creds (the shared SSO-vend helper)
  beforeAll(() => useKeyrack());

  given(
    '[case1] a replica key whose SecureString param the test provisioned',
    () => {
      const key = `PROBE_${getUuid().replace(/-/g, '_')}`;
      const slug = `@all.test.${key}`;
      const exid = `/keyrack/infra/vault/aws.params/v1/_test/ehmpathy/test/${key}`;
      const secret = `probe-secret-${getUuid()}`;

      const scene = useBeforeAll(async () => {
        const declastruct = await getOneDeclastructAws();
        const context = {
          ...asContextAwsApi({ region: REGION }),
          log: genLogMethods(),
        };
        await declastruct.sdkSsm.setParameter(
          { name: exid, value: secret, type: 'SecureString', overwrite: true },
          context,
        );
        return { declastruct, context };
      });

      afterAll(async () => {
        // teardown: delete the param the test provisioned (idempotent — safe if absent).
        // re-acquire the seams LOCALLY so teardown never depends on the deferred scene
        // proxy — a proxy read could return undefined and silently leak the param, so the
        // cleanup owns its own declastruct + context
        const declastruct = await getOneDeclastructAws();
        const context = {
          ...asContextAwsApi({ region: REGION }),
          log: genLogMethods(),
        };
        await declastruct.sdkSsm.delParameter({ name: exid }, context);
      });

      when('[t0] the adapter unlocks (pre-SSM prechecks)', () => {
        then('it passes with no throw (identity IS the unlock)', async () => {
          await vaultAdapterAwsParams.unlock({
            identity: null,
            exid,
            meta: META,
          });
        });
      });

      when('[t1] the adapter gets the grant (the SSM read)', () => {
        const read = useBeforeAll(async () => ({
          grant: await vaultAdapterAwsParams.get!({
            slug,
            exid,
            mech: 'PERMANENT_VIA_REPLICA',
            meta: META,
          }),
        }));

        then('it returns a grant that holds the decrypted secret', () => {
          expect(read.grant).not.toBeNull();
          expect(read.grant!.key.secret).toEqual(secret);
        });

        then('the grant records the aws.params vault + replica mech', () => {
          expect(read.grant!.source.vault).toEqual('aws.params');
          expect(read.grant!.source.mech).toEqual('PERMANENT_VIA_REPLICA');
        });

        then('the grant carries the slug env + org', () => {
          expect(read.grant!.env).toEqual('test');
          expect(read.grant!.org).toEqual('@all');
        });
      });
    },
  );

  given('[case2] a replica key whose param does not exist (gate 5)', () => {
    const key = `ABSENT_${getUuid().replace(/-/g, '_')}`;
    const slug = `@all.test.${key}`;
    const exid = `/keyrack/infra/vault/aws.params/v1/_test/ehmpathy/test/${key}`;

    when('[t0] the adapter gets the absent param', () => {
      then('it fails loud: param is absent, names the fix', async () => {
        const error = await getError(
          vaultAdapterAwsParams.get!({
            slug,
            exid,
            mech: 'PERMANENT_VIA_REPLICA',
            meta: META,
          }),
        );
        expect(error.message).toContain('absent');
      });
    });
  });

  given(
    '[case3] a param stored as plaintext String, not SecureString (gate 6)',
    () => {
      const key = `PLAINTEXT_${getUuid().replace(/-/g, '_')}`;
      const slug = `@all.test.${key}`;
      const exid = `/keyrack/infra/vault/aws.params/v1/_test/ehmpathy/test/${key}`;

      const scene = useBeforeAll(async () => {
        const declastruct = await getOneDeclastructAws();
        const context = {
          ...asContextAwsApi({ region: REGION }),
          log: genLogMethods(),
        };
        await declastruct.sdkSsm.setParameter(
          {
            name: exid,
            value: 'not-a-secret',
            type: 'String',
            overwrite: true,
          },
          context,
        );
        return { declastruct, context };
      });

      afterAll(async () => {
        // teardown: delete the param the test provisioned (idempotent — safe if absent).
        // re-acquire the seams LOCALLY so teardown never depends on the deferred scene
        // proxy — a proxy read could return undefined and silently leak the param, so the
        // cleanup owns its own declastruct + context
        const declastruct = await getOneDeclastructAws();
        const context = {
          ...asContextAwsApi({ region: REGION }),
          log: genLogMethods(),
        };
        await declastruct.sdkSsm.delParameter({ name: exid }, context);
      });

      when('[t0] the adapter gets the plaintext param', () => {
        then('it refuses: must be a SecureString', async () => {
          const error = await getError(
            vaultAdapterAwsParams.get!({
              slug,
              exid,
              mech: 'PERMANENT_VIA_REPLICA',
              meta: META,
            }),
          );
          expect(error.message).toContain('SecureString');
        });
      });
    },
  );
});
