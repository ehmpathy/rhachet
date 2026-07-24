import { UnexpectedCodePathError } from 'helpful-errors';

import { isGhWriteConflictStderr } from './isGhWriteConflictStderr';
import type { GhRun } from './runGh';

/**
 * .what = set a file in a github repo via the contents api (upsert semantics)
 * .why = keyrack-infra scaffolds and updates registry/github-apps.json remotely
 *
 * .note = `set` is the get/set/gen verb for always-write; semantics are upsert
 *         (overwrite when sha is passed, create when sha is null) — not findsert
 * .note = github contents api requires base64 content; an update needs the prior sha
 * .note = omit sha to create a new file; pass sha to overwrite an extant one
 * .note = returns { effect } so a findsert caller can tell a clean write ('set')
 *         from an optimistic-concurrency loss ('conflict') — a concurrent create
 *         (422) or a stale-sha update (409) — and re-read + retry instead of a hard
 *         failure; any other gh error still fails loud
 */
export const setGhFileContent = (
  input: {
    repo: string;
    path: string;
    content: string;
    message: string;
    sha: string | null;
  },
  context: { ghRun: GhRun },
): { effect: 'set' | 'conflict' } => {
  // github contents api expects base64 file content
  const contentBase64 = Buffer.from(input.content, 'utf-8').toString('base64');

  // build the gh api field args; include sha only to overwrite an extant file
  const fieldArgs = [
    '-f',
    `message=${input.message}`,
    '-f',
    `content=${contentBase64}`,
    ...(input.sha ? ['-f', `sha=${input.sha}`] : []),
  ];

  const result = context.ghRun({
    args: [
      'api',
      '--method',
      'PUT',
      `/repos/${input.repo}/contents/${input.path}`,
      ...fieldArgs,
    ],
  });

  // clean write
  if (result.status === 0) return { effect: 'set' };

  // optimistic-concurrency loss: a concurrent writer got there first → let the
  // caller re-read + retry rather than a hard failure
  if (isGhWriteConflictStderr({ stderr: result.stderr }))
    return { effect: 'conflict' };

  // any other gh error → fail loud
  throw new UnexpectedCodePathError('gh contents put failed', {
    repo: input.repo,
    path: input.path,
    stderr: result.stderr,
    status: result.status,
  });
};
