import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { text } from 'node:stream/consumers';

/**
 * .what = a minimal, in-process AWS SSM stand-in that speaks the real AWS JSON 1.1 wire
 *         protocol (GetParameter / PutParameter / DeleteParameter) over a local http port
 *
 * .why = the aws.params vault's headline behavior (uc5: unlock succeeds → get serves the
 *   value) can only be snapshotted at the CLI contract boundary if the subprocess can reach
 *   a live SSM backend in CI. real AWS is not reachable creds-free in CI, so the blueprint's
 *   endpoint-swap seam (KEYRACK_AWS_SSM_ENDPOINT → AWS_ENDPOINT_URL_SSM) points the REAL
 *   SSMClient at this local stand-in. the full keyrack → declastruct → @aws-sdk/client-ssm
 *   path runs verbatim — real request serialization, real SigV4 signing, real HTTP — and only
 *   the remote AWS service is a local stand-in. that is a backend SWAP, not a mock: no keyrack
 *   internal is faked (rule.forbid.acceptance.mocks holds; the blueprint sanctions "point the
 *   real SSMClient at a local SSM emulator ... a genuine HTTP call to a local endpoint").
 *
 * .scope = the three operations aws.params exercises — the reference read (GetParameter), the
 *   github-app persist (PutParameter), and del (DeleteParameter). it holds parameters in an
 *   in-memory map, so a set-then-get roundtrip within one journey reads back what was written.
 */
export const genFakeSsmServer = async (input?: {
  /** parameters to pre-seed, so a get needs no prior put (the reference-read journey) */
  seed?: { name: string; value: string; type?: string }[];
  /**
   * operations to fault-inject a real-format AccessDeniedException on (names match the SSM
   * operation, e.g. 'DeleteParameter'). lets an integration test drive the real
   * delKeyrackAwsParam → asKeyrackAwsParamErrorGate({ op:'delete' }) path through a denied call and
   * assert the classified gate + grant tree — the del error-classify seam end-to-end, in-worker. a
   * denial is a real 400 AccessDeniedException over the wire, so keyrack's gate classifies it as a
   * real AWS denial (a backend fault, not a mock — rule.forbid.integration.mocks holds)
   */
  deny?: string[];
}): Promise<{
  /** the base url to hand to KEYRACK_AWS_SSM_ENDPOINT */
  url: string;
  /** the live parameter store, so a test can assert what was persisted */
  params: Map<string, { value: string; type: string; version: number }>;
  /** count of requests the stand-in received — proves whether the SDK actually reached it */
  hits: () => number;
  /** shut the server down (call in afterAll) */
  close: () => Promise<void>;
}> => {
  const params = new Map<
    string,
    { value: string; type: string; version: number }
  >();
  // a simple request tally so a test can assert the SDK truly dialed the stand-in (vs real AWS)
  const counter = { hits: 0 };
  for (const s of input?.seed ?? [])
    params.set(s.name, {
      value: s.value,
      type: s.type ?? 'SecureString',
      version: 1,
    });

  // the set of operations to fault-inject an AccessDeniedException on (a real IAM denial
  // simulation). a denial is a real 400 over the wire, so keyrack's gate classifies it as a real
  // AWS denial — the same seam a live IAM denial hits, exercised in-worker for an integration test
  const deny = new Set(input?.deny ?? []);

  const server: Server = createServer((req, res) => {
    // tally the dial the instant a request lands, before any body parse
    counter.hits += 1;
    // read the whole request body without a mutable accumulator — node:stream/consumers.text reads
    // the request stream to completion functionally (no const-array `.push`, per
    // rule.require.immutable-vars). the AWS JSON 1.1 payload is a small json object
    void text(req).then((body) => {
      // the operation rides in the X-Amz-Target header as `AmazonSSM.<Operation>`
      const targetHeader = (req.headers['x-amz-target'] as string) ?? '';
      const operation = targetHeader.split('.').pop();

      // emit an AWS JSON 1.1 response — success carries the operation shape, a fault carries
      // `__type` in the body AND the x-amzn-errortype header (the SDK reads either to classify)
      const emit = (input: {
        status: number;
        body: unknown;
        errorType?: string;
      }): void => {
        res.writeHead(input.status, {
          'content-type': 'application/x-amz-json-1.1',
          // close the socket after each response. the AWS SDK's default node-http handler keeps
          // sockets alive, so a held-open keep-alive socket to this stand-in would keep the CLI
          // SUBPROCESS's event loop open — it would never exit, and the harness's spawnSync would
          // block forever (jest masks this with a force-exit; a real subprocess has no such escape).
          // `Connection: close` makes the SDK drop the socket after the response, so the subprocess
          // drains and exits cleanly
          connection: 'close',
          ...(input.errorType ? { 'x-amzn-errortype': input.errorType } : {}),
        });
        res.end(JSON.stringify(input.body));
      };

      // parse the AWS JSON 1.1 body — a malformed/truncated body must NOT crash the stand-in
      // (a synchronous throw here would take down the in-process server and flake the suite). emit
      // the wire-accurate 400 SerializationException instead, exactly as real SSM answers bad json.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the AWS JSON 1.1 body is an
      // untyped wire payload; downstream reads its fields (Name/Value/Overwrite/...) positionally,
      // exactly as the prior untyped JSON.parse did
      const parsed = ((): Record<string, any> | null => {
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

      // fault-injection — a denied operation returns the REAL-format AccessDeniedException AWS emits
      // (principal arn + action + resource + the "no identity-based policy" tail), so keyrack's gate
      // names the true denied action + renders the paste-ready grant tree. DeleteParameter/GetParameter
      // deny on the param name; DescribeParameters denies on `*` (it has no resource-level scope)
      if (deny.has(operation ?? '')) {
        const resource =
          operation === 'DescribeParameters'
            ? '*'
            : (payload.Name ?? payload.ResourceId ?? '*');
        return emit({
          status: 400,
          body: {
            __type: 'AccessDeniedException',
            message: `User: arn:aws:sts::000000000000:assumed-role/keyrack-standin-role/i-standin is not authorized to perform: ssm:${operation} on resource: ${resource} because no identity-based policy allows the action`,
          },
          errorType: 'AccessDeniedException',
        });
      }

      // GetParameter — the reference-read + roundtrip-verify seam
      if (operation === 'GetParameter') {
        const found = params.get(payload.Name);
        if (!found)
          return emit({
            status: 400,
            body: {
              __type: 'ParameterNotFound',
              message: `Parameter ${payload.Name} not found.`,
            },
            errorType: 'ParameterNotFound',
          });
        return emit({
          status: 200,
          body: {
            Parameter: {
              Name: payload.Name,
              Value: found.value,
              Type: found.type,
              Version: found.version,
              ARN: `arn:aws:ssm:us-east-1:000000000000:parameter${payload.Name}`,
              // AWS JSON deserializes timestamps as epoch-seconds numbers → a JS Date
              LastModifiedDate: 1_700_000_000,
            },
          },
        });
      }

      // PutParameter — the github-app persist seam (Overwrite:false rejects a re-put)
      if (operation === 'PutParameter') {
        const prior = params.get(payload.Name);
        if (prior && payload.Overwrite === false)
          return emit({
            status: 400,
            body: {
              __type: 'ParameterAlreadyExists',
              message: `Parameter ${payload.Name} already exists.`,
            },
            errorType: 'ParameterAlreadyExists',
          });
        const version = (prior?.version ?? 0) + 1;
        params.set(payload.Name, {
          value: payload.Value,
          type: payload.Type ?? 'String',
          version,
        });
        return emit({ status: 200, body: { Version: version, Tier: 'Standard' } });
      }

      // DescribeParameters — the write-path reconcile-read (metadata only, NO value). declastruct's
      // setSsmParameterSecure describes the param before + after the put to converge
      // description/tags, by an exact Name-equals filter. returns the metadata shape, never the value
      if (operation === 'DescribeParameters') {
        const filter = (payload.ParameterFilters ?? []).find(
          (f: { Key?: string; Values?: string[] }) => f && f.Key === 'Name',
        );
        const name = filter?.Values ? filter.Values[0] : undefined;
        const found = name ? params.get(name) : undefined;
        if (!found) return emit({ status: 200, body: { Parameters: [] } });
        return emit({
          status: 200,
          body: {
            Parameters: [
              {
                Name: name,
                Type: found.type,
                Version: found.version,
                ARN: `arn:aws:ssm:us-east-1:000000000000:parameter${name}`,
                LastModifiedDate: 1_700_000_000,
              },
            ],
          },
        });
      }

      // ListTagsForResource — the write-path tag reconcile-read (metadata only). the persist writes
      // no tags, so an empty TagList lets a declared `tags: null` converge to KEEP
      if (operation === 'ListTagsForResource') {
        return emit({ status: 200, body: { TagList: [] } });
      }

      // DeleteParameter — the del seam (idempotent absence → ParameterNotFound)
      if (operation === 'DeleteParameter') {
        if (!params.has(payload.Name))
          return emit({
            status: 400,
            body: {
              __type: 'ParameterNotFound',
              message: `Parameter ${payload.Name} not found.`,
            },
            errorType: 'ParameterNotFound',
          });
        params.delete(payload.Name);
        return emit({ status: 200, body: {} });
      }

      // any other operation is out of this stand-in's scope — fail loud, never a silent 200
      return emit({
        status: 400,
        body: { __type: 'UnknownOperationException', message: operation ?? 'none' },
        errorType: 'UnknownOperationException',
      });
    }).catch((cause) => {
      // a request-stream error (e.g. a socket reset before the body completes) rejects text(req);
      // handle it here so the rejection never escapes as an unhandledRejection — which, since node
      // 15, terminates the process and would flake the suite (rule.forbid.behavior-hazards). answer
      // the wire-accurate 500 InternalFailure and close the socket, as a real service does on an
      // internal fault
      res.writeHead(500, {
        'content-type': 'application/x-amz-json-1.1',
        'x-amzn-errortype': 'InternalFailure',
        connection: 'close',
      });
      res.end(
        JSON.stringify({
          __type: 'InternalFailure',
          message: cause instanceof Error ? cause.message : String(cause),
        }),
      );
    });
  });

  // bind to an ephemeral port on loopback so parallel suites never collide
  await new Promise<void>((ready) => {
    server.listen(0, '127.0.0.1', ready);
  });
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    params,
    hits: () => counter.hits,
    close: () =>
      new Promise<void>((done, fail) => {
        server.close((err) => (err ? fail(err) : done()));
      }),
  };
};
