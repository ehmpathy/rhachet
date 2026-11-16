/**
 * .what = a canned github api for a cli process, loaded with `NODE_OPTIONS=--require <this file>`
 * .why = proves a github-app mint end to end at the cli (the key decrypted from its vault, the jwt
 *        signed with it, the installation token returned to `get`) with no secret, no network,
 *        and no seam in prod code: @octokit/auth-app signs locally and calls `globalThis.fetch`
 *
 * .mock = the api.github.com installation-token endpoint
 * .why  = a real mint needs a live github app and its private key in ci, plus network; the
 *         commander's run on the grove (a real app, real github) is the live proof
 * .real = the commander's one command and the crew's `rhx keyrack get` on the hetzner box,
 *         named in the pr; `keyrack.githubApp.offEc2` proves every step up to this call
 *
 * env:
 *   CANNED_GITHUB_FETCH_LOG   path; one line is appended per mint call, so a test counts them
 *   CANNED_GITHUB_FETCH_MODE  `mint` (default): 201 with a canned `ghs_` token
 *                             `unreachable`: the fetch rejects as a dns failure would
 *                             `unavailable`: github answers 502, a fault a retry may cure
 *
 * .note = any other api.github.com path is refused loud, so an unexpected call never passes
 *         silently; a host that is not github passes through to the real fetch
 */
const { appendFileSync } = require('node:fs');

const fetchReal = globalThis.fetch;
const TOKEN_PATH = /^\/app\/installations\/(\d+)\/access_tokens$/;

globalThis.fetch = async (resource, init) => {
  const url = new URL(
    typeof resource === 'string' || resource instanceof URL
      ? resource
      : resource.url,
  );

  // a host that is not github passes through untouched
  if (url.hostname !== 'api.github.com') return fetchReal(resource, init);

  // record the call, so a test can count mints
  const logPath = process.env.CANNED_GITHUB_FETCH_LOG;
  if (logPath) appendFileSync(logPath, `${init?.method ?? 'GET'} ${url.pathname}\n`);

  // a github that cannot be reached
  if (process.env.CANNED_GITHUB_FETCH_MODE === 'unreachable')
    throw new TypeError('fetch failed', {
      cause: Object.assign(new Error('getaddrinfo ENOTFOUND api.github.com'), {
        code: 'ENOTFOUND',
      }),
    });

  // a github that answers, but cannot mint now
  if (process.env.CANNED_GITHUB_FETCH_MODE === 'unavailable')
    return new Response(JSON.stringify({ message: 'Bad Gateway' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });

  // the one endpoint the mint calls
  const match = TOKEN_PATH.exec(url.pathname);
  if (!match || (init?.method ?? 'GET').toUpperCase() !== 'POST')
    throw new Error(
      `fetch-canned-github: unexpected github call ${init?.method ?? 'GET'} ${url.pathname}`,
    );
  return new Response(
    JSON.stringify({
      token: `ghs_canned${match[1]}x${Date.now()}`,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      permissions: { contents: 'read' },
      repository_selection: 'all',
    }),
    { status: 201, headers: { 'content-type': 'application/json' } },
  );
};
