import { genLogMethods } from 'sdk-logs';
import { given, then, useBeforeAll, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { useKeyrack } from '@src/.test/infra/useKeyrack';

import { asContextAwsApi } from './asContextAwsApi';
import { asKeyrackAwsParamName } from './asKeyrackAwsParamName';
import { delKeyrackAwsParam } from './delKeyrackAwsParam';
import { getOneDeclastructAws } from './getOneDeclastructAws';
import { getOneKeyrackAwsParam } from './getOneKeyrackAwsParam';

/**
 * .what = integration tests for delKeyrackAwsParam — the real SSM destroy path
 *
 * .why = keyrack destroys the param it manages, so a removed key strands no secret in SSM. this
 *   proves the destroy end-to-end against REAL SSM: a SecureString is written at the computed
 *   name, del removes it, and a follow-up read confirms it is gone. it also proves del is
 *   idempotent (a no-op against an already-absent param), per declastruct's guarantee.
 *
 * .creds = re-vends the SSO session THROUGH keyrack as STATIC env creds (the shared helper),
 *   region supplied explicitly (us-east-1).
 */
const REGION = 'us-east-1';

describe('delKeyrackAwsParam integration', () => {
  beforeAll(() => useKeyrack());

  given(
    '[case1] a SecureString keyrack manages exists at the computed name',
    () => {
      const key = `DELTEST_${getUuid().replace(/-/g, '_')}`;
      const owner = '_test';
      const org = 'ehmpathy';
      const env = 'test';
      const slug = `${org}.${env}.${key}`;
      const exid = asKeyrackAwsParamName({ owner, org, env, key });

      // write a SecureString at the computed name so del has a real param to destroy
      const scene = useBeforeAll(async () => {
        const declastruct = await getOneDeclastructAws();
        await declastruct.setSsmParameterSecure(
          {
            upsert: new declastruct.DeclaredAwsSsmParameterSecure({
              name: exid,
              value: 'a-secret-value',
              keyId: null,
              description: null,
              tags: null,
            }),
          },
          { ...asContextAwsApi({ region: REGION }), log: genLogMethods() },
        );
        return { declastruct };
      });

      when('[t0] del is called for the key', () => {
        const removed = useBeforeAll(async () => {
          await delKeyrackAwsParam({
            slug,
            owner,
            region: REGION,
            identity: { source: 'imds' },
          });
          return { done: true };
        });

        then('the param is gone from real SSM', async () => {
          expect(removed.done).toEqual(true);
          const readback = await getOneKeyrackAwsParam(
            {
              exid,
              region: REGION,
              credsEnv: { AWS_PROFILE: undefined },
              endpoint: null,
            },
            { declastruct: scene.declastruct },
          );
          expect(readback).toBeNull();
        });

        then(
          'a second del is an idempotent no-op (already absent)',
          async () => {
            // must not throw when the param is already gone
            await delKeyrackAwsParam({
              slug,
              owner,
              region: REGION,
              identity: { source: 'imds' },
            });
            const readback = await getOneKeyrackAwsParam(
              {
                exid,
                region: REGION,
                credsEnv: { AWS_PROFILE: undefined },
                endpoint: null,
              },
              { declastruct: scene.declastruct },
            );
            expect(readback).toBeNull();
          },
        );
      });
    },
  );

  given('[case2] a foreign explicit --exid param the operator owns', () => {
    // del targets the COMPUTED name only, so an out-of-band param at a foreign path is NEVER
    // touched — the operator's shared/legacy param survives a key removal
    const key = `FOREIGNTEST_${getUuid().replace(/-/g, '_')}`;
    const owner = '_test';
    const org = 'ehmpathy';
    const env = 'test';
    const slug = `${org}.${env}.${key}`;
    const foreignExid = `/legacy/shared/${key}`;

    const scene = useBeforeAll(async () => {
      const declastruct = await getOneDeclastructAws();
      await declastruct.setSsmParameterSecure(
        {
          upsert: new declastruct.DeclaredAwsSsmParameterSecure({
            name: foreignExid,
            value: 'operator-owned-value',
            keyId: null,
            description: null,
            tags: null,
          }),
        },
        { ...asContextAwsApi({ region: REGION }), log: genLogMethods() },
      );
      return { declastruct };
    });

    afterAll(async () => {
      // teardown: remove the foreign param the test wrote (idempotent)
      const declastruct = await getOneDeclastructAws();
      await declastruct.sdkSsm.delParameter(
        { name: foreignExid },
        { ...asContextAwsApi({ region: REGION }), log: genLogMethods() },
      );
    });

    when('[t0] del is called for the key (which used the foreign exid)', () => {
      then(
        'the foreign param survives — del touched only the computed name',
        async () => {
          await delKeyrackAwsParam({
            slug,
            owner,
            region: REGION,
            identity: { source: 'imds' },
          });
          const readback = await getOneKeyrackAwsParam(
            {
              exid: foreignExid,
              region: REGION,
              credsEnv: { AWS_PROFILE: undefined },
              endpoint: null,
            },
            { declastruct: scene.declastruct },
          );
          expect(readback).not.toBeNull();
          expect(readback!.value).toEqual('operator-owned-value');
        },
      );
    });
  });
});
