import { UnexpectedCodePathError } from 'helpful-errors';

import type { GhRun } from './runGh';

/**
 * .what = read whether a github repo is private, public, or internal
 * .why = keyrack-infra's access IS its lock — a public repo would expose the org's
 *        app/install ids to the world, so a caller must be able to assert a
 *        pre-extant repo is private before it trusts or writes to the registry
 *
 * .note = gh returns the visibility as an uppercase enum (PUBLIC | PRIVATE | INTERNAL);
 *         we lowercase it so callers compare against a stable union
 * .note = any non-404 failure (network, rate limit, 500) fails loud rather than guess a
 *         visibility, so a transient outage never masquerades as a safe private repo
 */
export const getGhRepoVisibility = (
  input: { slug: string },
  context: { ghRun: GhRun },
): 'public' | 'private' | 'internal' => {
  const result = context.ghRun({
    args: ['repo', 'view', input.slug, '--json', 'visibility'],
  });

  // any non-zero exit → fail loud (never assume a visibility)
  if (result.status !== 0)
    throw new UnexpectedCodePathError('gh repo view (visibility) failed', {
      slug: input.slug,
      stderr: result.stderr,
      status: result.status,
      hint: 'check `gh auth status`; the api may be rate-limited or down — try again',
    });

  // read the visibility enum, lowercased for a stable compare
  const parsed = JSON.parse(result.stdout) as { visibility?: string };
  const visibility = (parsed.visibility ?? '').toLowerCase();
  if (
    visibility === 'public' ||
    visibility === 'private' ||
    visibility === 'internal'
  )
    return visibility;

  // an absent/unknown visibility → fail loud rather than assume private
  throw new UnexpectedCodePathError(
    'gh repo view returned an unknown visibility',
    {
      slug: input.slug,
      stdout: result.stdout,
      hint: 'expected a visibility of PUBLIC | PRIVATE | INTERNAL',
    },
  );
};
