import { BadRequestError } from 'helpful-errors';

/**
 * .what = parses a full brain slug into repo and slug parts
 * .why = symmetric inverse of getBrainSlugFull for user input
 *
 * .standard = brain.slug MUST always include the repo prefix.
 *   this function extracts repo from the first path segment and keeps
 *   the full input as the slug.
 *
 * @example
 *   getBrainSlugParts('xai/grok-3')
 *   // => { repo: 'xai', slug: 'xai/grok-3' }
 *
 *   getBrainSlugParts('anthropic/claude/sonnet')
 *   // => { repo: 'anthropic', slug: 'anthropic/claude/sonnet' }
 */
export const getBrainSlugParts = (
  fullSlug: string,
): { repo: string; slug: string } => {
  // find first slash to extract repo
  const firstSlashIndex = fullSlug.indexOf('/');

  // require at least one slash
  if (firstSlashIndex === -1)
    throw new BadRequestError(
      `invalid brain slug format "${fullSlug}". expected: repo/slug`,
      { fullSlug },
    );

  // extract repo from first segment
  const repo = fullSlug.slice(0, firstSlashIndex);

  // require non-empty repo
  if (!repo)
    throw new BadRequestError(
      `invalid brain slug format "${fullSlug}". expected: repo/slug`,
      { fullSlug },
    );

  // require non-empty slug after repo
  const slugRemainder = fullSlug.slice(firstSlashIndex + 1);
  if (!slugRemainder)
    throw new BadRequestError(
      `invalid brain slug format "${fullSlug}". expected: repo/slug`,
      { fullSlug },
    );

  // slug is the FULL input (includes repo prefix by standard)
  return { repo, slug: fullSlug };
};
