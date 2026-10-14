import type { BrainSlug } from '@src/domain.objects/BrainSlug';

import { createHash } from 'node:crypto';

/**
 * .what = the 8-char content hash that identifies a DELTA enrollment { brain, ambient ⊕ delta }
 * .why =
 *   - an enroll like `--roles -driver` stands for "the repo's ambient roles, minus driver".
 *     its identity is that delta, never the concrete roles it resolves to today, so a change
 *     to the ambient set (`rhx init --roles -xyz`) re-derives the SAME actor rather than mint
 *     a new one (`inventory.of=requirements.case=2`)
 *   - the digest names its own shape (`base: 'ambient'`), so it can never collide with a
 *     concrete-roles digest of `genEnrollmentHash`, whose shape is unchanged
 *
 * .note = the delta tokens are sorted before the digest, so `-a +b` and `+b -a` are one actor
 */
export const genEnrollmentHashOfDelta = (input: {
  brain: BrainSlug;
  rolesDelta: string[];
}): string => {
  const data = JSON.stringify({
    brain: input.brain,
    base: 'ambient',
    delta: [...input.rolesDelta].sort(),
  });
  return createHash('sha256').update(data).digest('hex').slice(0, 8);
};
