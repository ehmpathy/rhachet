/* eslint-disable */
'use strict';
/**
 * .what = a standalone GitHub API stand-in that runs as its OWN os process (spawned detached by
 *   the acceptance suite), which speaks the real REST + GraphQL wire shapes the `gh` cli calls
 *   for `auth status`, `secret set`, and `secret delete`, over local HTTPS.
 *
 * .why = a jest-spawned CLI subprocess CANNOT reach a listener that lives INSIDE the jest worker
 *   process (the same empirical result `ssmStandInServer.cjs` records), but it CAN reach a
 *   listener in a SEPARATE detached process. the github.secrets vault shells out to the REAL `gh`
 *   binary from a spawned `rhachet keyrack` subprocess, so the stand-in must live here, in its own
 *   process — reachable over loopback.
 *
 *   `gh` honors `GH_HOST` (it dials `https://$GH_HOST/api/v3/...`) and `SSL_CERT_FILE` (its Go
 *   trust pool), so the real binary can be pointed here. the whole client stack runs: `gh` looks
 *   up the host, negotiates TLS, authenticates, builds the request, libsodium-encrypts the secret,
 *   and PUTs it. that makes this a backend **swap**, never a mock (`term=swap`,
 *   `rule.forbid.acceptance.mocks`).
 *
 * ⚠️ .why-https-and-not-http = unlike the SSM stand-in (plain http, because the AWS SDK accepts an
 *   `http://` endpoint override), `gh` REFUSES a scheme in `GH_HOST` and IGNORES `GITHUB_API_URL`
 *   entirely — it always dials `https://`. so this stand-in must serve real TLS, against a
 *   committed self-signed cert (see `../assets/gh-api-swap/readme.md`).
 *
 * ⚠️ .why-no-libsodium = this vault is WRITE-ONLY (`vaultAdapterGithubSecrets.ts` sets `get: null`),
 *   so the stand-in never has to DECRYPT — it only has to SERVE a public key that `gh` can encrypt
 *   against. an x25519 public key is 32 opaque bytes, so `randomBytes(32)` is a structurally valid
 *   one and `gh` performs the real sealed-box itself. the ciphertext it PUTs is genuine; we simply
 *   never open it. that is why no libsodium dependency is needed.
 *
 * .contract = binds 127.0.0.1 on an ephemeral port; prints exactly one line
 *   `STANDIN_HOST=localhost:<port>` to stdout once ready, so the parent can capture it and hand it
 *   to `GH_HOST` (which takes a host:port, never a url).
 *
 * .scope = the requests `gh` makes for this vault's operations:
 *   - `POST /api/graphql`   — `query UserCurrent{viewer{login}}`, for `gh auth status`
 *   - `POST /api/graphql`   — `query RepositoryInfo{repository{name}}`, for `gh repo view --json name`
 *   - `GET  /api/v3/`       — the api root probe, also for `gh auth status`
 *   - `GET  /api/v3/repos/{owner}/{repo}/actions/secrets/public-key`
 *   - `PUT|DELETE /api/v3/repos/{owner}/{repo}/actions/secrets/{name}`
 *   - `GET  /api/v3/repos/{org}/keyrack-infra/contents/registry/github-apps.json` — the app registry
 *   - `PUT  /api/v3/repos/{org}/keyrack-infra/contents/...`                       — a registry write
 *   - `GET  /api/v3/orgs/{org}/installations`                                     — the install list
 *
 * ⚠️ .why-the-infra-routes = the guided `EPHEMERAL_VIA_GITHUB_APP` set discovers which app to use by
 *   reading the `keyrack-infra` registry, and every one of those reads is `gh api ...` — so they
 *   ride the same swap. the registry contents mirror the two-app fixture the guided flow prompts
 *   over, so the app-choice prompt still has something to choose between.
 */
const { randomBytes } = require('node:crypto');
const { readFileSync } = require('node:fs');
const https = require('node:https');
const { join } = require('node:path');

// the committed self-signed localhost cert. generated once with openssl and checked in, so no
// cert-generation dependency and no runtime `openssl` host binary are needed — see the fixture's
// readme for why each alternative was refused (rule.forbid.bare-host-deps)
const assetDir = join(__dirname, '..', 'assets', 'gh-api-swap');
const certPath = join(assetDir, 'localhost.selfsigned.cert.pem');
const keyPath = join(assetDir, 'localhost.selfsigned.key.pem');

// the live secret store: name -> { encryptedValue, keyId }
const secrets = new Map();

// the repo public key gh encrypts against. 32 opaque bytes is a valid x25519 public key; gh does
// the real sealed-box against it, and this stand-in never decrypts (write-only vault)
const publicKey = randomBytes(32).toString('base64');
const publicKeyId = '568250167715278791';

// the keyrack-infra app registry the guided github-app flow reads. TWO apps, so the app-choice
// prompt still has something to choose between — the same fixture shape the prior PATH stub served
const registryApps = [
  {
    org: 'testorg',
    appId: '123456',
    installationId: '12345678',
    slug: 'my-test-app',
  },
  {
    org: 'testorg',
    appId: '654321',
    installationId: '87654321',
    slug: 'other-app',
  },
];

const server = https.createServer(
  { key: readFileSync(keyPath), cert: readFileSync(certPath) },
  (req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      const path = req.url || '';

      // emit a github-shaped json response. `connection: close` mirrors the ssm stand-in's
      // rationale: a held-open keep-alive socket would keep a client's event loop open, so a
      // spawned `gh` would never drain
      const emit = (status, obj) => {
        res.writeHead(status, {
          'content-type': 'application/json',
          // gh reads the token's scopes off this header when it reports auth status
          'x-oauth-scopes': 'repo, read:org, admin:org',
          connection: 'close',
        });
        res.end(JSON.stringify(obj));
      };

      // graphql — gh routes two of its commands here, distinguished by the query body
      if (path === '/api/graphql') {
        // `gh auth status` asks `query UserCurrent{viewer{login}}` to name the account
        if (body.includes('viewer'))
          return emit(200, { data: { viewer: { login: 'faker' } } });

        // `gh repo view <slug> --json name` asks `query RepositoryInfo{repository{name}}`. every
        // repo this stand-in is asked about exists — the suite drives the found-registry path, and
        // the absent-repo path is a different fixture's concern
        if (body.includes('repository')) {
          const parsed = (() => {
            try {
              return JSON.parse(body);
            } catch (e) {
              return null;
            }
          })();
          const name = (parsed && parsed.variables && parsed.variables.name) || 'keyrack-infra';
          return emit(200, { data: { repository: { name } } });
        }

        // fail loud on an unexpected query rather than answer a shape gh did not ask for
        return emit(400, {
          message: 'unexpected graphql query: ' + body.slice(0, 120),
        });
      }

      // the keyrack-infra app registry — the github contents api answers base64 + sha
      if (path.endsWith('/contents/registry/github-apps.json')) {
        if (req.method === 'PUT') return emit(200, {});
        return emit(200, {
          content: Buffer.from(JSON.stringify(registryApps)).toString('base64'),
          sha: 'standinsha00000000000000000000000000000',
        });
      }

      // the org install list — the admin discovery path
      if (/\/orgs\/[^/]+\/installations$/.test(path))
        return emit(200, {
          installations: registryApps.map((app) => ({
            id: Number(app.installationId),
            app_id: Number(app.appId),
            app_slug: app.slug,
          })),
        });

      // the api root probe, also part of gh auth status
      if (path === '/api/v3' || path === '/api/v3/')
        return emit(200, { current_user_url: 'https://localhost/user' });

      // the repo public key — gh GETs this, then libsodium-encrypts the secret against it
      if (path.endsWith('/actions/secrets/public-key'))
        return emit(200, { key_id: publicKeyId, key: publicKey });

      // a named secret: PUT persists the ciphertext, DELETE removes it
      const named = /\/actions\/secrets\/([^/]+)$/.exec(path);
      if (named) {
        const name = named[1];
        if (req.method === 'PUT') {
          const parsed = (() => {
            try {
              return JSON.parse(body);
            } catch (e) {
              return null;
            }
          })();
          if (parsed === null)
            return emit(400, { message: 'body was not json' });
          secrets.set(name, {
            encryptedValue: parsed.encrypted_value || '',
            keyId: parsed.key_id || '',
          });
          // github answers 201 on create / 204 on update; gh treats both as success
          return emit(204, {});
        }
        if (req.method === 'DELETE') {
          secrets.delete(name);
          return emit(204, {});
        }
      }

      // any other path is outside this stand-in's scope — fail loud, never a silent 200, so a new
      // gh call site surfaces as a red test rather than a quietly-wrong pass
      return emit(404, {
        message: 'stand-in has no route for ' + req.method + ' ' + path,
      });
    });
  },
);

// bind to an ephemeral port on loopback; announce the host:port so the parent can capture it.
// `localhost` (not 127.0.0.1) because the committed cert's CN is localhost, and gh verifies it
server.listen(0, '127.0.0.1', () => {
  const { port } = server.address();
  process.stdout.write(`STANDIN_HOST=localhost:${port}\n`);
});

// a clean shutdown on signal, so the parent's kill() drains sockets and exits
process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
