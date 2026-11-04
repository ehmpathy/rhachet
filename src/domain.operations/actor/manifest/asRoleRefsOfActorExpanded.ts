import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { isRoleSpecifierMatch } from '@src/domain.operations/roles/isRoleSpecifierMatch';

import type { ActorExpanded } from './getActorExpanded';

/**
 * .what = the linked refs an expanded actor declares — every linked ref where no actor is given
 * .why = the repo actor's roles are every linked role with no manifest, and the `ambient:`
 *        actor's under one; one transformer says so for init and enroll alike
 */
export const asRoleRefsOfActorExpanded = (input: {
  refsLinked: RoleLinkRef[];
  expanded: ActorExpanded | null;
}): RoleLinkRef[] => {
  const { expanded } = input;
  if (!expanded) return input.refsLinked;
  return input.refsLinked.filter((ref) =>
    expanded.roles.some((role) =>
      isRoleSpecifierMatch({ left: role, right: `${ref.repo}/${ref.role}` }),
    ),
  );
};
