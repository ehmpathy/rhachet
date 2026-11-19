import type { BrainSlug } from '@src/domain.objects/BrainSlug';

import { createHash } from 'node:crypto';

/**
 * .what = the 8-char content hash that identifies a DERIVED actor — a declared actor `@<slug>`
 *         with a brain override or role deltas on top (`actor.via.slug=<slug>._.delta=<h>`)
 * .why = a derived actor stands for "`@<slug>`, plus or minus these". its identity is that
 *        override, never the concrete roles it expands to today, so an edit to `@<slug>` in
 *        `actors.yml` re-derives the SAME actor rather than mint a new one (F7, S4)
 *
 * .note = the digest names its base (`@<slug>`), so it never collides with the ambient delta
 *         digest of `genEnrollmentHashOfDelta`, nor with one over another base
 * .note = the delta tokens are sorted before the digest, so `-a +b` and `+b -a` are one actor
 */
export const genEnrollmentHashOfActorDelta = (input: {
  brain: BrainSlug;
  base: string;
  rolesDelta: string[];
}): string => {
  const data = JSON.stringify({
    brain: input.brain,
    base: input.base,
    delta: [...input.rolesDelta].sort(),
  });
  return createHash('sha256').update(data).digest('hex').slice(0, 8);
};
