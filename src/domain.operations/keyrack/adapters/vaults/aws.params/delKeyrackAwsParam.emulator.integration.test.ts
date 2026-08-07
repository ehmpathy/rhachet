import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { genFakeSsmServer } from '@/blackbox/.test/infra/genFakeSsmServer';
import { asKeyrackAwsParamName } from './asKeyrackAwsParamName';
import { delKeyrackAwsParam } from './delKeyrackAwsParam';

/**
 * .what = proves the del ERROR path end-to-end at the integration grain: a real SSM AccessDenied on
 *         DeleteParameter, driven through the WHOLE delKeyrackAwsParam → declastruct → SDK → HTTP
 *         path, surfaces the classified gate — the true denied action + the paste-ready del grant
 *         list — NOT a bare MalfunctionError and NOT "no AWS identity"
 *
 * .why = the del-gate routing (delKeyrackAwsParam.ts catch → asKeyrackAwsParamErrorGate({op:'delete'}))
 *   was the standing blocker: del used to hand-roll a generic MalfunctionError that hid the raw AWS
 *   cause. the gate itself is unit-clamped (asKeyrackAwsParamErrorGate.test.ts case8), but no test
 *   proved that delKeyrackAwsParam actually CALLS the gate with op:'delete' — the catch had zero
 *   regression pressure. this drives a REAL denied DeleteParameter through the real del path so a
 *   regression to the routing (a reverted MalfunctionError, a dropped op flag) trips loud and local.
 *
 * .backend = the in-process genFakeSsmServer with deny:['DeleteParameter'] — a REAL 400
 *   AccessDeniedException over the wire (the real-format principal + action + resource), so keyrack's
 *   gate classifies a genuine AWS denial. the full keyrack → declastruct → @aws-sdk/client-ssm path
 *   runs verbatim; only the remote service is local. that is a backend swap, not a mock
 *   (rule.forbid.integration.mocks holds). the endpoint-swap seam (KEYRACK_AWS_SSM_ENDPOINT →
 *   AWS_ENDPOINT_URL_SSM) points the real SSMClient at the stand-in, gated on NODE_ENV=test.
 *
 * .flow = declastruct's delSsmParameterSecure is type-guarded: it FIRST reads metadata
 *   (getOneSsmParameterSecure = DescribeParameters + ListTagsForResource) to confirm the param is a
 *   SecureString, THEN deletes (DeleteParameter). so the seeded param makes the metadata read find it,
 *   and DeleteParameter is where the denial fires — the del-unique action.
 */
const REGION = 'us-east-1';
const OWNER = '_test';
const ORG = 'ehmpathy';
const ENV = 'test';
const KEY = 'DEL_DENY_EMULATOR_PROBE';
const SLUG = `${ORG}.${ENV}.${KEY}`;
// the COMPUTED-namespace name del targets — seed the stand-in here so the metadata read finds it and
// the flow reaches DeleteParameter (an absent param would make del a no-op, never reaching Delete)
const NAME = asKeyrackAwsParamName({
  owner: OWNER,
  org: ORG,
  env: ENV,
  key: KEY,
});
const SEEDED_SECRET = 'sk-del-deny-seeded-value';

/** .what = read the rendered hint off a caught classed error (metadata.hint), no as-cast
 *  .why = getError returns a bare Error type, so narrow to the helpful-error metadata via in +
 *         typeof refinements (rule.forbid.as-cast) — the same refinement style the gate unit test uses */
const getHint = (error: Error): string => {
  if ('metadata' in error) {
    const { metadata } = error;
    if (
      typeof metadata === 'object' &&
      metadata !== null &&
      'hint' in metadata &&
      typeof metadata.hint === 'string'
    )
      return metadata.hint;
  }
  throw new Error('expected a string hint in the error metadata');
};

describe('delKeyrackAwsParam del-denied (emulator integration)', () => {
  given(
    '[case1] a stand-in that denies DeleteParameter, seeded with the managed SecureString',
    () => {
      const scene = useBeforeAll(async () => {
        // the param exists so the metadata read finds it; DeleteParameter is denied so the destroy
        // fails at the del-unique action — the exact partial-grant state the incident-class produces
        const ssm = await genFakeSsmServer({
          seed: [{ name: NAME, value: SEEDED_SECRET }],
          deny: ['DeleteParameter'],
        });
        // point the real SSMClient at the stand-in (the endpoint-swap seam), and give the SDK dummy
        // static creds so it signs synchronously against the local stand-in — save/restore so no
        // sibling suite inherits the override
        const prior = {
          endpoint: process.env.KEYRACK_AWS_SSM_ENDPOINT,
          nodeEnv: process.env.NODE_ENV,
          akid: process.env.AWS_ACCESS_KEY_ID,
          secret: process.env.AWS_SECRET_ACCESS_KEY,
        };
        process.env.KEYRACK_AWS_SSM_ENDPOINT = ssm.url;
        process.env.NODE_ENV = 'test';
        process.env.AWS_ACCESS_KEY_ID = 'test-akid';
        process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
        return { ssm, prior };
      });

      afterAll(async () => {
        await scene.ssm.close();
        // restore each env var to its prior value (delete when it was absent)
        const restore = (k: string, v: string | undefined): void => {
          if (v === undefined) delete process.env[k];
          else process.env[k] = v;
        };
        restore('KEYRACK_AWS_SSM_ENDPOINT', scene.prior.endpoint);
        restore('NODE_ENV', scene.prior.nodeEnv);
        restore('AWS_ACCESS_KEY_ID', scene.prior.akid);
        restore('AWS_SECRET_ACCESS_KEY', scene.prior.secret);
      });

      when('[t0] del is attempted while DeleteParameter is denied', () => {
        const caught = useBeforeAll(async () => ({
          error: await getError(
            delKeyrackAwsParam({
              slug: SLUG,
              owner: OWNER,
              region: REGION,
              identity: { source: 'imds' },
            }),
          ),
        }));

        then(
          'the del throws the classed caller-fixable ConstraintError',
          () => {
            expect(caught.error).toBeInstanceOf(ConstraintError);
          },
        );

        then(
          'it names the TRUE denied action ssm:DeleteParameter, NOT "no AWS identity" (req2)',
          () => {
            expect(caught.error.message).toContain('ssm:DeleteParameter');
            expect(caught.error.message).not.toContain('no AWS identity');
          },
        );

        then(
          'the verbatim raw AWS line is forwarded to the human (req1)',
          () => {
            const hint = getHint(caught.error);
            expect(hint).toContain('why (raw AWS)');
            expect(hint).toContain('AccessDeniedException');
            expect(hint).toContain('ssm:DeleteParameter on resource');
          },
        );

        then(
          'the paste-ready del grant list renders — Describe(*), ListTags, Delete (req3)',
          () => {
            const hint = getHint(caught.error);
            expect(hint).toContain('aws.params del needs these grants');
            expect(hint).toContain(
              'ssm:DescribeParameters on * (MUST be "*", no resource scope)',
            );
            expect(hint).toContain('ssm:ListTagsForResource');
            expect(hint).toContain('ssm:DeleteParameter');
          },
        );

        then(
          'the del grant list omits Get/Put/kms (a del never reads a value nor decrypts)',
          () => {
            const hint = getHint(caught.error);
            expect(hint).not.toContain('ssm:GetParameter');
            expect(hint).not.toContain('ssm:PutParameter');
            expect(hint).not.toContain('kms:');
          },
        );

        then(
          'the seeded secret value never leaks into the rendered error (safety boundary)',
          () => {
            expect(caught.error.message).not.toContain(SEEDED_SECRET);
            expect(getHint(caught.error)).not.toContain(SEEDED_SECRET);
          },
        );
      });
    },
  );
});
