import { ConstraintError } from 'helpful-errors';
import { genLogMethods } from 'sdk-logs';
import { getError, given, then, useBeforeAll, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { genMockGhRun } from '@src/.test/assets/genMockGhRun';
import { genTempPemFile } from '@src/.test/assets/genTempPemFile';
import { useKeyrack } from '@src/.test/infra/useKeyrack';

import { asContextAwsApi } from './asContextAwsApi';
import { getOneDeclastructAws } from './getOneDeclastructAws';
import { getOneKeyrackAwsParam } from './getOneKeyrackAwsParam';
import { setKeyrackAwsParamGithubApp } from './setKeyrackAwsParamGithubApp';

/**
 * .what = integration tests for setKeyrackAwsParamGithubApp (the owned-secret persist path)
 *
 * .why = this orchestrator acquires a github-app blob via mechAdapterGithubApp.acquireForSet,
 *   then persists it into SSM + roundtrip-verifies. two lanes:
 *   - [case1] the no-TTY fail-loud: discovery runs headlessly via an injected mock gh runner
 *     (a single-app keyrack-infra registry, so app selection auto-picks with no real gh api
 *     call), but NO pem source is injected, so the pem prompt fires the real no-TTY guard —
 *     an unattended process must fail loud rather than hang on a prompt no process can answer
 *     (creds-free + deterministic; a bare no-mech form would fall through to a live gh call
 *     that rate-limits on rapid re-runs and surfaces a gh-auth error, not the no-terminal guard).
 *   - [case2] the real persist + roundtrip + overwrite/rotation: with a credential source
 *     INJECTED via context.mech (the DI seam every mech-guided vault uses), the blob is
 *     produced headlessly and written to REAL SSM, then read back and re-set to demonstrate
 *     overwrite/rotation. this is the highest-blast-radius mech's write side — the exact
 *     "silently orphan a live secret" hazard the vault exists to guard.
 *
 * .scope = the mint-token READ side (unlock -> ~1h installation token, c8/c36) needs a REAL
 *   github app to mint against; a fake blob cannot mint, so that lane stays gated on real
 *   github-app credentials (a genuine external constraint, not a wire-through gap). the WRITE
 *   side (persist/roundtrip/overwrite) is covered here.
 *
 * .creds = case2 re-vends the SSO session THROUGH keyrack as STATIC env creds (the shared
 *   helper), region supplied explicitly (us-east-1); the github side is faked via genMockGhRun
 *   + a temp pem, so no real github-app credentials are needed for the write side.
 */
const REGION = 'us-east-1';

describe('setKeyrackAwsParamGithubApp integration', () => {
  given('[case1] an unattended process with no terminal (a grove)', () => {
    // a mock gh runner whose keyrack-infra registry holds a single ehmpathy app, so discovery +
    // selection run HEADLESSLY (auto-select on the sole candidate) and reach the pem prompt with
    // NO real gh api call. no `question` is injected, so the real no-TTY guard fires at that
    // prompt — the case stays creds-free AND deterministic (a bare no-mech form fell through to a
    // live gh discovery call, which rate-limited on the rapid re-run and surfaced a gh-auth error
    // instead of the no-terminal guard: a flake, not the contract)
    const scene = useBeforeAll(async () => {
      const ghRun = genMockGhRun({
        files: [
          {
            repo: 'ehmpathy/keyrack-infra',
            path: 'registry/github-apps.json',
            content: JSON.stringify([
              {
                org: 'ehmpathy',
                appId: '123',
                installationId: '456',
                slug: 'my-app',
              },
            ]),
          },
        ],
      });
      return { ghRun };
    });

    when(
      '[t0] set is called with no injected pem source and the prompt is unanswerable',
      () => {
        // acquire the fail-loud error ONCE: headless discovery via the mock gh runner reaches the
        // pem prompt, where the real no-TTY guard fires. wrap it in a holder object so each
        // then-block reads the RAW error off `outcome.error` (the same one-level proxy access
        // case2 uses via `scene.mech`) — one invocation, no redundant re-run
        // (rule.forbid.redundant-expensive-operations)
        const outcome = useBeforeAll(async () => {
          const error = await getError(
            setKeyrackAwsParamGithubApp(
              {
                slug: 'ehmpathy.test.EHMPATHY_SEATURTLE_GITHUB_TOKEN',
                exid: '/keyrack/infra/vault/aws.params/v1/_test/ehmpathy/test/EHMPATHY_SEATURTLE_GITHUB_TOKEN',
                region: REGION,
                identity: { source: 'imds' },
              },
              // inject the mock gh runner (headless discovery) but NO question, so the real
              // no-TTY guard fires at the pem prompt — creds-free + deterministic
              { mech: { ghRun: scene.ghRun } },
            ),
          );
          // assert the class on the RAW error — an instanceof on the shared proxy is unreliable
          expect(error).toBeInstanceOf(ConstraintError);
          return { error };
        });

        then('the message names the non-terminal stdin', () => {
          expect(outcome.error.message).toContain('stdin is not a terminal');
        });

        then('the fail-loud names the fix', () => {
          expect((outcome.error as ConstraintError).metadata).toMatchObject({
            hint: expect.stringContaining('terminal'),
          });
        });
      },
    );
  });

  given(
    '[case2] a source injected via context.mech (the DI seam) + real SSM',
    () => {
      // real AWS identity as STATIC env creds (the shared SSO-vend helper); scoped to this
      // case so case1 stays creds-free
      beforeAll(() => useKeyrack());

      // the write authenticates as the GROVE identity ({ source: 'imds' }) — useKeyrack vends it
      // as static env creds with AWS_PROFILE cleared, so no per-org SSO profile (unusable in jest)
      // is needed. the specific-org profile overlay is covered at the unit grain in
      // setKeyrackAwsParamGithubApp.identity.test.ts
      const key = `GHAPP_${getUuid().replace(/-/g, '_')}`;
      const slug = `ehmpathy.test.${key}`;
      const exid = `/keyrack/infra/vault/aws.params/v1/_test/ehmpathy/test/${key}`;

      // inject a fake gh runner whose registry already holds one app + a temp pem on disk, so
      // acquireForSet produces a real blob headlessly (no gh cli, no terminal)
      const scene = useBeforeAll(async () => {
        const pem = genTempPemFile();
        const ghRun = genMockGhRun({
          files: [
            {
              repo: 'ehmpathy/keyrack-infra',
              path: 'registry/github-apps.json',
              content: JSON.stringify([
                {
                  org: 'ehmpathy',
                  appId: '123',
                  installationId: '456',
                  slug: 'my-app',
                },
              ]),
            },
          ],
        });
        const mech = { ghRun, question: async (): Promise<string> => pem.path };
        return { pem, mech };
      });

      afterAll(async () => {
        // teardown: delete the param the test wrote (idempotent — safe if absent). re-acquire
        // the seams locally so cleanup never depends on the deferred scene proxy
        const declastruct = await getOneDeclastructAws();
        const context = {
          ...asContextAwsApi({ region: REGION }),
          log: genLogMethods(),
        };
        await declastruct.sdkSsm.delParameter({ name: exid }, context);
      });

      when('[t0] set persists the acquired blob into SSM (c3)', () => {
        const persisted = useBeforeAll(async () =>
          setKeyrackAwsParamGithubApp(
            { slug, exid, region: REGION, identity: { source: 'imds' } },
            { mech: scene.mech },
          ),
        );

        then('it returns the github-app mech + the exid it wrote', () => {
          expect(persisted.mech).toEqual('EPHEMERAL_VIA_GITHUB_APP');
          expect(persisted.exid).toEqual(exid);
          expect(persisted.meta.region).toEqual(REGION);
        });

        then(
          'the blob is readable back from real SSM (roundtrip)',
          async () => {
            const declastruct = await getOneDeclastructAws();
            const readback = await getOneKeyrackAwsParam(
              {
                exid,
                region: REGION,
                credsEnv: { AWS_PROFILE: undefined },
                endpoint: null,
              },
              { declastruct },
            );
            expect(readback).not.toBeNull();
            const parsed = JSON.parse(readback!.value);
            expect(parsed.appId).toEqual('123');
            expect(parsed.installationId).toEqual('456');
            expect(parsed.privateKey).toEqual(scene.pem.content);
          },
        );
      });

      when('[t1] set is re-run with a rotated pem (overwrite, c39)', () => {
        const rotated = useBeforeAll(async () => {
          const pem = genTempPemFile();
          const ghRun = genMockGhRun({
            files: [
              {
                repo: 'ehmpathy/keyrack-infra',
                path: 'registry/github-apps.json',
                content: JSON.stringify([
                  {
                    org: 'ehmpathy',
                    appId: '123',
                    installationId: '456',
                    slug: 'my-app',
                  },
                ]),
              },
            ],
          });
          await setKeyrackAwsParamGithubApp(
            { slug, exid, region: REGION, identity: { source: 'imds' } },
            {
              mech: { ghRun, question: async (): Promise<string> => pem.path },
            },
          );
          return { pem };
        });

        then('the re-set overwrites the prior blob (no error)', async () => {
          const declastruct = await getOneDeclastructAws();
          const readback = await getOneKeyrackAwsParam(
            {
              exid,
              region: REGION,
              credsEnv: { AWS_PROFILE: undefined },
              endpoint: null,
            },
            { declastruct },
          );
          // the rotated pem is now stored — the upsert overwrote, it did not error
          const parsed = JSON.parse(readback!.value);
          expect(parsed.privateKey).toEqual(rotated.pem.content);
        });
      });
    },
  );
});
