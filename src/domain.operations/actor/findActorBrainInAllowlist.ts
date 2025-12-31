import { BadRequestError } from 'helpful-errors';

import type { BrainRepl } from '@src/domain.objects/BrainRepl';

/**
 * .what = finds a brain in the actor's allowlist
 * .why = validates that a requested brain is permitted by the actor
 *
 * .note = accepts either:
 *   - ref: { repo, slug } for lookup by unique key
 *   - direct BrainRepl instance for validation against allowlist
 */
export const findActorBrainInAllowlist = (input: {
  brain: { repo: string; slug: string } | BrainRepl;
  allowlist: BrainRepl[];
}): BrainRepl => {
  // extract repo and slug from brain (whether ref or instance)
  const brainRef = {
    repo: input.brain.repo,
    slug: input.brain.slug,
  };

  // lookup brain in allowlist by unique key
  const brainFound = input.allowlist.find(
    (b) => b.repo === brainRef.repo && b.slug === brainRef.slug,
  );

  // fail if brain not in allowlist
  if (!brainFound)
    throw new BadRequestError('brain not in actor allowlist', {
      brainRef,
      allowlistRefs: input.allowlist.map((b) => ({
        repo: b.repo,
        slug: b.slug,
      })),
    });

  return brainFound;
};
