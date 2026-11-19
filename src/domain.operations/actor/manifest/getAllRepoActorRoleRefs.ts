import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

import { asRoleRefsOfActorExpanded } from './asRoleRefsOfActorExpanded';
import { getOneActorExpandedOfRepo } from './getOneActorExpandedOfRepo';

/**
 * .what = the repo actor's roles, as linked refs — every linked role with no manifest, or the
 *         linked roles the `ambient:` actor declares under one
 * .why = the repo actor holds the ambient roles, and only it (`term=ambient`). with no
 *        manifest the ambient roles are every linked role, as main ships it; under
 *        `ambient: '@<x>'` they are `@<x>`'s roles, so a bare `claude` boots `@<x>` and a delta
 *        actor (`-driver`) re-derives from `@<x>` (`inventory.of=requirements.case=2`)
 *
 * .note = init links the union of every declared actor, so more roles are linked than the
 *         repo actor holds; the render and the enroll each read this narrowed set
 * .note = a native `.this` role is ambient only where the `ambient:` actor declares it
 *         (`.this/<role>`) — the manifest is the whole statement of the repo actor's roles
 */
export const getAllRepoActorRoleRefs = async (
  input: { refsLinked: RoleLinkRef[] },
  context: ContextCli,
): Promise<RoleLinkRef[]> =>
  asRoleRefsOfActorExpanded({
    refsLinked: input.refsLinked,
    expanded: await getOneActorExpandedOfRepo(
      { actor: { ambient: true } },
      context,
    ),
  });
