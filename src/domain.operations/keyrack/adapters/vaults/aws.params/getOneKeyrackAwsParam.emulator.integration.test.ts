import { given, then, useBeforeAll, when } from 'test-fns';

import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { text } from 'node:stream/consumers';
import { getOneDeclastructAws } from './getOneDeclastructAws';
import { getOneKeyrackAwsParam } from './getOneKeyrackAwsParam';

/**
 * .what = proves the endpoint-swap seam: getOneKeyrackAwsParam, given an `endpoint`, points the
 *         REAL @aws-sdk/client-ssm SSMClient at a local SSM stand-in that speaks the genuine AWS
 *         JSON 1.1 wire protocol — so the full keyrack → declastruct → SDK → HTTP path runs with
 *         NO real AWS and NO creds beyond the dummy static pair the SDK signs with
 *
 * .why = the acceptance/journey harness relies on this exact swap (KEYRACK_AWS_SSM_ENDPOINT →
 *   AWS_ENDPOINT_URL_SSM) to snapshot a POSITIVE unlock→get in CI. that whole edifice rests on
 *   ONE unproven fact: does declastruct's `new SSMClient({ region })` honor the SDK-native
 *   AWS_ENDPOINT_URL_SSM env var this seam sets? if it does NOT, the SDK dials real AWS, hangs (or
 *   errors) in a creds-free/network-restricted CI, and every downstream acceptance snapshot is a
 *   lie. this test isolates that fact at the seam — a fast, creds-free roundtrip against a local
 *   stand-in — so a regression (an SDK bump that drops the env-var, a declastruct reshuffle) trips
 *   HERE, loud and local, not as a mysterious multi-minute hang in the acceptance suite.
 *
 * .backend = a real HTTP server (not a mock) that answers GetParameter in the AWS JSON 1.1 shape.
 *   the SDK really serializes, really SigV4-signs (with the dummy env creds), really POSTs. only
 *   the remote service is local — a backend swap, exactly as the acceptance harness does it.
 */

// a minimal SSM stand-in: answers GetParameter for a single seeded SecureString, in the AWS JSON
// 1.1 shape the real SDK deserializes (Parameter.Value/Type/Version/ARN, epoch-seconds date)
const genLocalSsmStandIn = async (input: {
  name: string;
  value: string;
}): Promise<{ url: string; close: () => Promise<void> }> => {
  const server: Server = createServer((req, res) => {
    // read the whole request body without a mutable accumulator — node:stream/consumers.text
    // drains the request stream to completion functionally (no const-array `.push`, per
    // rule.require.immutable-vars), as the peer stand-ins genFakeSsmServer + Detached do
    void text(req)
      .then((body) => {
        const emit = (emitInput: {
          status: number;
          body: unknown;
          errorType?: string;
        }): void => {
          res.writeHead(emitInput.status, {
            'content-type': 'application/x-amz-json-1.1',
            ...(emitInput.errorType
              ? { 'x-amzn-errortype': emitInput.errorType }
              : {}),
          });
          res.end(JSON.stringify(emitInput.body));
        };

        // parse the AWS JSON 1.1 body — a malformed/truncated body must NOT crash the stand-in (a
        // synchronous throw here would take down the in-process server and flake the suite). emit the
        // wire-accurate 400 SerializationException instead, as genFakeSsmServer.ts + real SSM do
        const parsed = ((): Record<string, unknown> | null => {
          if (!body) return {};
          try {
            return JSON.parse(body);
          } catch {
            return null;
          }
        })();
        if (parsed === null)
          return emit({
            status: 400,
            body: {
              __type: 'SerializationException',
              message: 'failed to parse the request body as json',
            },
            errorType: 'SerializationException',
          });
        const payload = parsed;
        const operation = ((req.headers['x-amz-target'] as string) ?? '')
          .split('.')
          .pop();
        if (operation === 'GetParameter') {
          if (payload.Name !== input.name)
            return emit({
              status: 400,
              body: { __type: 'ParameterNotFound', message: 'not found' },
              errorType: 'ParameterNotFound',
            });
          return emit({
            status: 200,
            body: {
              Parameter: {
                Name: input.name,
                Value: input.value,
                Type: 'SecureString',
                Version: 1,
                ARN: `arn:aws:ssm:us-east-1:000000000000:parameter${input.name}`,
                LastModifiedDate: 1_700_000_000,
              },
            },
          });
        }
        return emit({
          status: 400,
          body: {
            __type: 'UnknownOperationException',
            message: operation ?? 'none',
          },
          errorType: 'UnknownOperationException',
        });
      })
      .catch((cause) => {
        // a request-stream error (e.g. a socket reset before the body completes) rejects text(req);
        // handle it here so the rejection never escapes as an unhandledRejection — which, since node
        // 15, terminates the process and would flake the suite (rule.forbid.behavior-hazards). answer
        // the wire-accurate 500 InternalFailure and close the socket, as a real service does on an
        // internal fault
        res.writeHead(500, {
          'content-type': 'application/x-amz-json-1.1',
          'x-amzn-errortype': 'InternalFailure',
        });
        res.end(
          JSON.stringify({
            __type: 'InternalFailure',
            message: cause instanceof Error ? cause.message : String(cause),
          }),
        );
      });
  });
  await new Promise<void>((ready) => server.listen(0, '127.0.0.1', ready));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((done, fail) =>
        server.close((err) => (err ? fail(err) : done())),
      ),
  };
};

const REGION = 'us-east-1';
const EXID =
  '/keyrack/infra/vault/aws.params/v1/mechanic/ehmpathy/test/EMULATOR_PROBE';
const SECRET = 'sk-emulator-probe-value';

describe('getOneKeyrackAwsParam endpoint-swap (emulator integration)', () => {
  given('[case1] a local SSM stand-in seeded with one SecureString', () => {
    const scene = useBeforeAll(async () => {
      const ssm = await genLocalSsmStandIn({ name: EXID, value: SECRET });
      const declastruct = await getOneDeclastructAws();
      // dummy static creds so the SDK uses the synchronous env provider (no SSO dynamic import,
      // no IMDS dial) and signs the request against the local stand-in
      const priorAkid = process.env.AWS_ACCESS_KEY_ID;
      const priorSecret = process.env.AWS_SECRET_ACCESS_KEY;
      process.env.AWS_ACCESS_KEY_ID = 'test-akid';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
      return { ssm, declastruct, priorAkid, priorSecret };
    });

    afterAll(async () => {
      await scene.ssm.close();
      if (scene.priorAkid === undefined) delete process.env.AWS_ACCESS_KEY_ID;
      else process.env.AWS_ACCESS_KEY_ID = scene.priorAkid;
      if (scene.priorSecret === undefined)
        delete process.env.AWS_SECRET_ACCESS_KEY;
      else process.env.AWS_SECRET_ACCESS_KEY = scene.priorSecret;
    });

    when('[t0] the read seam is pointed at the stand-in via endpoint', () => {
      const read = useBeforeAll(async () => ({
        param: await getOneKeyrackAwsParam(
          {
            exid: EXID,
            region: REGION,
            credsEnv: { AWS_PROFILE: undefined },
            endpoint: scene.ssm.url,
          },
          { declastruct: scene.declastruct },
        ),
      }));

      then(
        'the SDK honors AWS_ENDPOINT_URL_SSM and reaches the stand-in',
        () => {
          // a null/hang here would mean the endpoint was NOT honored (the SDK dialed real AWS);
          // a concrete value proves the swap works — the whole acceptance harness rests on this
          expect(read.param).not.toBeNull();
        },
      );

      then('the seeded SecureString value is returned', () => {
        expect(read.param!.value).toEqual(SECRET);
      });

      then('the type is SecureString', () => {
        expect(read.param!.type).toEqual('SecureString');
      });
    });

    when('[t1] the read seam targets an absent param', () => {
      then('it returns null (ParameterNotFound → null)', async () => {
        const result = await getOneKeyrackAwsParam(
          {
            exid: '/keyrack/infra/vault/aws.params/v1/mechanic/ehmpathy/test/ABSENT',
            region: REGION,
            credsEnv: { AWS_PROFILE: undefined },
            endpoint: scene.ssm.url,
          },
          { declastruct: scene.declastruct },
        );
        expect(result).toBeNull();
      });
    });
  });
});
