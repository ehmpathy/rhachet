import { UnexpectedCodePathError } from 'helpful-errors';

import { isGhForbiddenStderr } from './isGhForbiddenStderr';
import type { GhRun } from './runGh';

/**
 * .what = attempt the org-owner-gated list of app installations for an org
 * .why = admins use this to discover apps; members are forbidden (403) and must
 *        fall back to the keyrack-infra registry
 *
 * .note = returns { forbidden: true } ONLY on a genuine 403/permission denial —
 *         the signal that distinguishes a member from an admin
 * .note = any other non-zero exit (network, rate limit, gh error) fails loud
 *         rather than masquerade as a member
 */
export const getGhOrgInstalls = (
  input: { org: string },
  context: { ghRun: GhRun },
):
  | { forbidden: true }
  | {
      forbidden: false;
      installs: { appId: string; installationId: string; slug: string }[];
    } => {
  const result = context.ghRun({
    args: ['api', `/orgs/${input.org}/installations`],
  });

  // non-zero exit → distinguish a genuine 403 (member) from other failures
  if (result.status !== 0) {
    // genuine permission denial → member path
    if (isGhForbiddenStderr({ stderr: result.stderr }))
      return { forbidden: true };

    // any other failure (network, rate limit, gh error) → fail loud
    throw new UnexpectedCodePathError('gh org installations list failed', {
      org: input.org,
      stderr: result.stderr,
      status: result.status,
      hint: 'check `gh auth status`; if authenticated, the org api may be rate-limited or down — try again',
    });
  }

  // parse the installations array; fail loud with context if it is not json
  // note: `as` is allowed here — this is the untyped github rest api boundary;
  // absent/odd fields degrade to an empty install list below, never a crash.
  // removal path: adopt the octokit sdk's typed client instead of the gh cli.
  const parsed = ((): {
    installations?: { id: number; app_id: number; app_slug: string }[];
  } => {
    try {
      return JSON.parse(result.stdout) as {
        installations?: { id: number; app_id: number; app_slug: string }[];
      };
    } catch (error) {
      throw new UnexpectedCodePathError(
        'gh org installations response was not json',
        {
          org: input.org,
          stdout: result.stdout,
          error,
          hint: 'the github installations api returned a non-json body; check `gh auth status` and retry',
        },
      );
    }
  })();

  const installs = (parsed.installations ?? []).map((install) => ({
    appId: String(install.app_id),
    installationId: String(install.id),
    slug: install.app_slug,
  }));

  return { forbidden: false, installs };
};
