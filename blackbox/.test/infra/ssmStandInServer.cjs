/* eslint-disable */
'use strict';
/**
 * .what = a standalone AWS SSM stand-in that runs as its OWN os process (spawned detached by
 *   the acceptance journey), which speaks the genuine AWS JSON 1.1 wire protocol
 *   (GetParameter / PutParameter / DeleteParameter) over a local http port.
 *
 * .why = a jest-spawned CLI subprocess CANNOT reach an http listener that lives INSIDE the jest
 *   worker process (proven empirically — the worker's inbound loopback is blocked), but it CAN
 *   reach a listener in a SEPARATE detached process. so the acceptance journey's positive
 *   unlock→get path (which runs the real @aws-sdk/client-ssm inside a spawned `rhx keyrack`
 *   subprocess) needs the SSM backend to live here, in its own process — reachable over loopback.
 *   the full keyrack → declastruct → SDK → HTTP path runs verbatim; only the AWS service is a
 *   local stand-in. that is a backend SWAP, not a mock (rule.forbid.acceptance.mocks holds).
 *
 * .contract = reads a json seed array from env KEYRACK_SSM_STANDIN_SEED (each { name, value,
 *   type? }); binds 127.0.0.1 on an ephemeral port; prints exactly one line
 *   `STANDIN_URL=http://127.0.0.1:<port>` to stdout once ready, so the parent can capture it.
 *   holds parameters in an in-memory map, so a put-then-get roundtrip within one journey reads
 *   back what was written.
 */
const http = require('node:http');

// the live parameter store: name -> { value, type, version }
const params = new Map();

// pre-seed from env so a get needs no prior put (the reference-read journey)
try {
  const seed = JSON.parse(process.env.KEYRACK_SSM_STANDIN_SEED || '[]');
  for (const s of seed)
    params.set(s.name, {
      value: s.value,
      type: s.type || 'SecureString',
      version: 1,
    });
} catch (e) {
  process.stderr.write('[ssm-standin] bad seed json: ' + String(e) + '\n');
}

// the set of operations to fault-inject an AccessDeniedException on (a real IAM denial
// simulation). names match the X-Amz-Target operation (e.g. "DescribeParameters"). this lets an
// acceptance test drive the real CLI through a denied call and snapshot the rendered grant-tree a
// human actually sees — the failtrim forward + grant list, exercised end-to-end, not only at the
// unit grain. a denial is a real 400 AccessDeniedException over the wire, so keyrack's gate
// classifies it as a real AWS denial (a backend fault, not a mock — rule.forbid.acceptance.mocks)
let deny = new Set();
try {
  deny = new Set(JSON.parse(process.env.KEYRACK_SSM_STANDIN_DENY || '[]'));
} catch (e) {
  process.stderr.write('[ssm-standin] bad deny json: ' + String(e) + '\n');
}

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    // the operation rides in the X-Amz-Target header as `AmazonSSM.<Operation>`
    const targetHeader = req.headers['x-amz-target'] || '';
    const operation = String(targetHeader).split('.').pop();
    const payload = body ? JSON.parse(body) : {};

    // emit an AWS JSON 1.1 response — a fault carries `__type` in the body AND the
    // x-amzn-errortype header (the SDK reads either to classify)
    const emit = (status, obj, errorType) => {
      res.writeHead(status, {
        'content-type': 'application/x-amz-json-1.1',
        // close the socket after each response — the AWS SDK's default keep-alive would otherwise
        // hold this server's socket open; `Connection: close` lets it drain cleanly
        connection: 'close',
        ...(errorType ? { 'x-amzn-errortype': errorType } : {}),
      });
      res.end(JSON.stringify(obj));
    };

    // fault-injection — a denied operation returns the REAL-format AccessDeniedException AWS emits
    // (principal arn + action + resource + the "no identity-based policy" tail), so keyrack's gate
    // names the true denied action + renders the paste-ready grant tree. DescribeParameters denies
    // on `*` (it has no resource-level scope — the exact incident trap); the rest echo the param name
    if (deny.has(operation)) {
      const resource =
        operation === 'DescribeParameters'
          ? '*'
          : payload.Name || payload.ResourceId || '*';
      return emit(
        400,
        {
          __type: 'AccessDeniedException',
          message: `User: arn:aws:sts::000000000000:assumed-role/keyrack-standin-role/i-standin is not authorized to perform: ssm:${operation} on resource: ${resource} because no identity-based policy allows the action`,
        },
        'AccessDeniedException',
      );
    }

    // GetParameter — the reference-read + roundtrip-verify seam
    if (operation === 'GetParameter') {
      const found = params.get(payload.Name);
      if (!found)
        return emit(
          400,
          {
            __type: 'ParameterNotFound',
            message: `Parameter ${payload.Name} not found.`,
          },
          'ParameterNotFound',
        );
      return emit(200, {
        Parameter: {
          Name: payload.Name,
          Value: found.value,
          Type: found.type,
          Version: found.version,
          ARN: `arn:aws:ssm:us-east-1:000000000000:parameter${payload.Name}`,
          LastModifiedDate: 1_700_000_000,
        },
      });
    }

    // PutParameter — the github-app persist seam (Overwrite:false rejects a re-put)
    if (operation === 'PutParameter') {
      const prior = params.get(payload.Name);
      if (prior && payload.Overwrite === false)
        return emit(
          400,
          {
            __type: 'ParameterAlreadyExists',
            message: `Parameter ${payload.Name} already exists.`,
          },
          'ParameterAlreadyExists',
        );
      const version = (prior ? prior.version : 0) + 1;
      params.set(payload.Name, {
        value: payload.Value,
        type: payload.Type || 'String',
        version,
      });
      return emit(200, { Version: version, Tier: 'Standard' });
    }

    // DescribeParameters — the write-path reconcile-read (metadata only, NO value). declastruct's
    // setSsmParameterSecure describes the param before + after the put to converge description/tags,
    // by an exact Name-equals filter. returns the metadata shape (never the value)
    if (operation === 'DescribeParameters') {
      const filter = (payload.ParameterFilters || []).find(
        (f) => f && f.Key === 'Name',
      );
      const name = filter && filter.Values ? filter.Values[0] : undefined;
      const found = name ? params.get(name) : undefined;
      if (!found) return emit(200, { Parameters: [] });
      return emit(200, {
        Parameters: [
          {
            Name: name,
            Type: found.type,
            Version: found.version,
            ARN: `arn:aws:ssm:us-east-1:000000000000:parameter${name}`,
            LastModifiedDate: 1_700_000_000,
          },
        ],
      });
    }

    // ListTagsForResource — the write-path tag reconcile-read (metadata only). the persist writes no
    // tags, so an empty TagList lets a declared `tags: null` converge to KEEP
    if (operation === 'ListTagsForResource') {
      return emit(200, { TagList: [] });
    }

    // DeleteParameter — the del seam (idempotent absence → ParameterNotFound)
    if (operation === 'DeleteParameter') {
      if (!params.has(payload.Name))
        return emit(
          400,
          {
            __type: 'ParameterNotFound',
            message: `Parameter ${payload.Name} not found.`,
          },
          'ParameterNotFound',
        );
      params.delete(payload.Name);
      return emit(200, {});
    }

    // any other operation is out of scope — fail loud, never a silent 200
    return emit(
      400,
      { __type: 'UnknownOperationException', message: operation || 'none' },
      'UnknownOperationException',
    );
  });
});

// bind to an ephemeral port on loopback; announce the url so the parent can capture it
server.listen(0, '127.0.0.1', () => {
  const { port } = server.address();
  process.stdout.write(`STANDIN_URL=http://127.0.0.1:${port}\n`);
});

// a clean shutdown on signal, so the parent's kill() drains sockets and exits
process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
