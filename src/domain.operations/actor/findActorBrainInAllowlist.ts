import { BadRequestError } from 'helpful-errors';

import type { ActorBrain } from '@src/domain.objects/Actor';
import { getBrainSlugFull } from '@src/domain.operations/brains/getBrainSlugFull';

/**
 * .what = finds a brain in the actor's allowlist
 * .why = validates that a requested brain is permitted by the actor
 *
 * .note = accepts either:
 *   - ref: { repo, slug } for lookup by unique key
 *   - direct ActorBrain instance for validation against allowlist
 *
 * .note = uses getBrainSlugFull for comparison to handle both normal and
 *   buggy brain conventions (where slug may or may not include repo prefix)
 */
export const findActorBrainInAllowlist = (input: {
  brain: { repo: string; slug: string } | ActorBrain;
  allowlist: ActorBrain[];
}): ActorBrain => {
  // compute full slug for input brain ref
  const brainSlugFull = getBrainSlugFull(input.brain);

  // lookup brain in allowlist by full slug comparison
  const brainFound = input.allowlist.find(
    (b) => getBrainSlugFull(b) === brainSlugFull,
  );

  // fail if brain not in allowlist
  if (!brainFound)
    throw new BadRequestError('brain not in actor allowlist', {
      brainSlugFull,
      allowlistSlugs: input.allowlist.map(getBrainSlugFull),
    });

  return brainFound;
};
