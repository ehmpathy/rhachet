import { ConstraintError } from 'helpful-errors';

import { isGithubRateLimitError } from './isGithubRateLimitError';

/**
 * .what = the caller-fixable refusal a github-app mint fault maps to, or null when the fault is
 *         not the caller's to fix
 * .why = three mint faults trace to the stored blob, so each owes a hint that names the cure:
 *        a pem that is not an rsa key (crypto throws deep in @octokit/auth-app), a key github
 *        refuses (401 — the blob is stale, e.g. the app key was rotated upstream after this box
 *        filed its copy), and an installation github will not serve (404 / 403 — uninstalled,
 *        suspended, or another org's). every other fault (network, rate limit, 5xx) maps to null,
 *        and the caller re-throws it untouched (no failhide); a 403 throttle is a rate limit,
 *        told apart by `isGithubRateLimitError`
 *
 * .note = neither refusal carries the key: only the app id, the http status, and the fault text,
 *         none of which holds a secret
 */
export const asGithubAppMintFaultRefusal = (input: {
  error: unknown;
  appId: string;
}): Error | null => {
  // a key github refused: the blob is stale, or never matched this app
  const status =
    input.error instanceof Error &&
    'status' in input.error &&
    typeof input.error.status === 'number'
      ? input.error.status
      : null;
  // .note = each hint names the fault and stops at "re-file the current blob"; the vault that
  //         holds the blob appends its own command (asGithubAppMintFaultWithCure), since a cure
  //         for one vault would move a key held in another
  if (status === 401)
    return new ConstraintError(
      'failed to mint github app token — github refused the stored private key (401)',
      {
        appId: input.appId,
        status,
        fault: 'key-refused',
        // .note = github answers a jwt signed under a skewed clock with the same 401, so the
        //         hint names the clock before the re-file, or a good blob is re-filed in vain
        hint: "the stored blob is stale or belongs to another app, or this box's clock is off (a skewed jwt also draws a 401; check the box's time sync first). if the app key was rotated, re-file the current blob",
      },
    );

  // an installation github does not know, or an app it will not serve
  // .note = a 403 is also how github throttles (primary and secondary rate limits); a throttle
  //         is not the caller's to fix, so it falls through to null and is re-thrown untouched
  const isRateLimited =
    status === 403 && isGithubRateLimitError({ error: input.error });
  if (status === 404 || (status === 403 && !isRateLimited))
    return new ConstraintError(
      `failed to mint github app token — github refused the stored installation (${status})`,
      {
        appId: input.appId,
        status,
        fault: 'installation-refused',
        hint: "the blob's appId or installationId names none github will serve: the app was uninstalled or suspended, the blob names another org, or its appId names no app. check the app's id and install, then re-file the current blob",
      },
    );

  // a pem that is not an rsa key: crypto nests the root reason on its `cause`
  const causeMessage =
    input.error instanceof Error &&
    'cause' in input.error &&
    input.error.cause instanceof Error
      ? input.error.cause.message
      : '';
  const text = [
    input.error instanceof Error ? input.error.message : String(input.error),
    causeMessage,
  ]
    .join(' ')
    .trim();
  // only crypto-decode tokens mark a key fault; a bare "unsupported" or ".pem" in an unrelated
  // fault (an api version, a path) must not be told its key is bad
  const isKeyFault =
    /invalid keydata|failed to read private key|DECODER routines|PEM routines|asn1/i.test(
      text,
    );
  if (isKeyFault)
    return new ConstraintError(
      'failed to mint github app token — the stored private key (.pem) is not a valid rsa key',
      {
        appId: input.appId,
        fault: 'key-invalid',
        hint: 're-set the key with a valid github app private key (.pem) file',
        reason: text,
      },
    );

  // any other fault is not the caller's to fix
  return null;
};
