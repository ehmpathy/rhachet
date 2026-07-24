import { UnexpectedCodePathError } from 'helpful-errors';

import { isGhNotFoundStderr } from './isGhNotFoundStderr';
import type { GhRun } from './runGh';

/**
 * .what = read a file's decoded content + blob sha from a github repo
 * .why = the keyrack-infra registry is a file we read (and later update) via the
 *        github contents api, member-scoped by the caller's gh token
 *
 * .note = returns null ONLY for a genuine 404 (absent file); any other failure
 *         (network, rate limit, 500) fails loud so a caller never mistakes a
 *         transient outage for absence and overwrites a file that truly exists
 * .note = sha is required to update the file later (github contents api needs it)
 * .note = github returns file content as base64
 */
export const getGhFileContent = (
  input: { repo: string; path: string },
  context: { ghRun: GhRun },
): { content: string; sha: string } | null => {
  const result = context.ghRun({
    args: ['api', `/repos/${input.repo}/contents/${input.path}`],
  });

  // non-zero exit → distinguish a genuine 404 (absent) from other failures
  if (result.status !== 0) {
    // genuine 404 → the file is absent; caller decides how to handle
    if (isGhNotFoundStderr({ stderr: result.stderr })) return null;

    // any other failure (network, rate limit, gh error) → fail loud
    throw new UnexpectedCodePathError('gh contents read failed', {
      repo: input.repo,
      path: input.path,
      stderr: result.stderr,
      status: result.status,
      hint: 'check `gh auth status`; if authenticated, the api may be rate-limited or down — try again',
    });
  }

  // parse the contents api response; fail loud with context if it is not json
  // note: `as` is allowed here — this is the untyped github rest api boundary;
  // the shape is validated immediately below (fail loud if content/sha absent).
  // removal path: adopt the octokit sdk's typed client instead of the gh cli.
  const parsed = ((): { content?: string; sha?: string } => {
    try {
      return JSON.parse(result.stdout) as { content?: string; sha?: string };
    } catch (error) {
      throw new UnexpectedCodePathError('gh contents response was not json', {
        repo: input.repo,
        path: input.path,
        stdout: result.stdout,
        error,
        hint: 'the github contents api returned a non-json body; check `gh auth status` and retry',
      });
    }
  })();

  // github returns base64 content for files
  if (!parsed.content || !parsed.sha) {
    throw new UnexpectedCodePathError(
      'github contents response lacked content or sha',
      { repo: input.repo, path: input.path },
    );
  }

  const decoded = Buffer.from(parsed.content, 'base64').toString('utf-8');
  return { content: decoded, sha: parsed.sha };
};
