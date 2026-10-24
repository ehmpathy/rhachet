import { ConstraintError } from 'helpful-errors';

import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import type { RoleLinkRefAtFocus } from '@src/domain.objects/RoleLinkRefAtFocus';
import { asRoleRefsInEnrollmentOrder } from '@src/domain.operations/boot/asRoleRefsInEnrollmentOrder';
import { asRoleRefsFirstSeenPerRole } from '@src/domain.operations/init/roles/link/asRoleRefsFirstSeenPerRole';
import { asRoleFocusMap } from '@src/domain.operations/roles/focus/asRoleFocusMap';
import { asRoleRefsAtFoci } from '@src/domain.operations/roles/focus/asRoleRefsAtFoci';
import { getAllRolesUnlinked } from '@src/domain.operations/roles/focus/getAllRolesUnlinked';

/**
 * .what = map an actor's enrolled slugs onto the linked refs, in enrollment order, each with
 *         the subjects the actor is focused on
 * .why = an actor's brain dir renders only the roles it enrolled; a slug that is no
 *        longer linked cannot render, so it fails loud with the two fixes that exist
 *
 * .note = a focused slug (`mechanic::flow`) is matched by its role; its subjects ride on the ref
 * .note = no did-you-mean: the slug was valid once and went stale, so a typo hint would mislead
 */
export const asRoleRefsForEnrolledSlugs = (input: {
  actorExid: string;
  slugs: string[];
  refsLinked: RoleLinkRef[];
}): RoleLinkRefAtFocus[] => {
  const refsOnePerRole = asRoleRefsFirstSeenPerRole({ refs: input.refsLinked });
  const foci = asRoleFocusMap({ tokens: input.slugs });

  // every enrolled role must still be linked
  const slugsUnlinked = getAllRolesUnlinked({ refs: refsOnePerRole, foci });
  if (slugsUnlinked.length > 0)
    throw new ConstraintError(
      `actor ${input.actorExid} enrolled a role no longer linked: ${slugsUnlinked.join(', ')}`,
      {
        actorExid: input.actorExid,
        slugsUnlinked,
        hint: `re-link the role (rhx roles link --role ${slugsUnlinked[0]}), or end the actor's live clones so the sweep skips it`,
      },
    );

  // each enrolled ref, with the subjects its focus names
  return asRoleRefsInEnrollmentOrder({
    refs: asRoleRefsAtFoci({ refs: refsOnePerRole, foci }),
  });
};
