import { ConstraintError } from 'helpful-errors';

import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { isRoleSpecifierMatch } from '@src/domain.operations/roles/isRoleSpecifierMatch';

import type { ActorExpanded } from './getActorExpanded';

/**
 * .what = the linked refs an expanded actor declares — every linked ref where no actor is given
 * .why = the repo actor's roles are every linked role with no manifest, and the `ambient:`
 *        actor's under one; one transformer says so for init and enroll alike
 *
 * .note = a declared role that matches no linked ref is refused, never dropped: a silent
 *   absence would boot the repo actor short of a role it declares. the refusal is the one a
 *   peer actor meets on `rhx clone @<slug>`, so every declared actor fails the same way
 */
export const asRoleRefsOfActorExpanded = (input: {
  refsLinked: RoleLinkRef[];
  expanded: ActorExpanded | null;
}): RoleLinkRef[] => {
  const { expanded } = input;
  if (!expanded) return input.refsLinked;

  // every declared role must name a linked ref
  const roleUnlinked = expanded.roles.find(
    (role) =>
      !input.refsLinked.some((ref) =>
        isRoleSpecifierMatch({ left: role, right: `${ref.repo}/${ref.role}` }),
      ),
  );
  if (roleUnlinked)
    throw new ConstraintError(
      `@${expanded.slug} declares role '${roleUnlinked}', which is not linked`,
      {
        actor: `@${expanded.slug}`,
        role: roleUnlinked,
        hint: 'run `rhx init` — it links the roles every declared actor names',
      },
    );

  // the linked refs the actor declares
  return input.refsLinked.filter((ref) =>
    expanded.roles.some((role) =>
      isRoleSpecifierMatch({ left: role, right: `${ref.repo}/${ref.role}` }),
    ),
  );
};
