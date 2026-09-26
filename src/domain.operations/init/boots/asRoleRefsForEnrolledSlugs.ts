import { ConstraintError } from 'helpful-errors';

import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { asRoleRefsInEnrollmentOrder } from '@src/domain.operations/boot/asRoleRefsInEnrollmentOrder';
import { asRoleRefsFirstSeenPerRole } from '@src/domain.operations/init/roles/link/asRoleRefsFirstSeenPerRole';

/**
 * .what = map an actor's enrolled slugs onto the linked refs, in enrollment order
 * .why = an actor's brain dir renders only the roles it enrolled; a slug that is no
 *        longer linked cannot render, so it fails loud with the two fixes that exist
 *
 * .note = no did-you-mean: the slug was valid once and went stale, so a typo hint would mislead
 */
export const asRoleRefsForEnrolledSlugs = (input: {
  actorHash: string;
  slugs: string[];
  refsLinked: RoleLinkRef[];
}): RoleLinkRef[] => {
  const refsOnePerRole = asRoleRefsFirstSeenPerRole({ refs: input.refsLinked });

  // every enrolled slug must still be linked
  const slugsUnlinked = input.slugs.filter(
    (slug) => !refsOnePerRole.some((ref) => ref.role === slug),
  );
  if (slugsUnlinked.length > 0)
    throw new ConstraintError(
      `actor ${input.actorHash} enrolled a role no longer linked: ${slugsUnlinked.join(', ')}`,
      {
        actorHash: input.actorHash,
        slugsUnlinked,
        hint: `re-link the role (rhx roles link --role ${slugsUnlinked[0]}), or end the actor's live clones so the sweep skips it`,
      },
    );

  return asRoleRefsInEnrollmentOrder({
    refs: refsOnePerRole.filter((ref) => input.slugs.includes(ref.role)),
  });
};
