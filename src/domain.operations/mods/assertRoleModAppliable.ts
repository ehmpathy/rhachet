import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleModdedViewHookBasis } from '@src/domain.objects/RoleModdedViewRecord';

import { assertRoleKindDirsLinksOnly } from './assertRoleKindDirsLinksOnly';
import { assertRoleModNotsSpareHookSkills } from './assertRoleModNotsSpareHookSkills';
import { getAllRoleModHookCommands } from './getAllRoleModHookCommands';
import type { getOneRoleModStateOrRefusal } from './getOneRoleModStateOrRefusal';

/**
 * .what = refuse a mod whose plan cannot apply to its role: a not of a skill a hook invokes, or a
 *         kind dir that holds a file no link made
 * .why = the render refuses on these before it swaps the view, and the stop sweep holds on them;
 *        both read this one check, so a refusal the render adds is a fault the stop names
 *
 * .note = it writes naught; a refusal is a throw, as each check raises it
 * .note = the hook check runs first, as the render has always run it, so one mod with both faults
 *   names the same one on both surfaces
 */
export const assertRoleModAppliable = async (
  input: {
    state: NonNullable<ReturnType<typeof getOneRoleModStateOrRefusal>['state']>;
    hookBasis: RoleModdedViewHookBasis | null;
  },
  context: ContextCli,
): Promise<void> => {
  // a not of a skill a hook invokes is refused
  if (input.hookBasis)
    assertRoleModNotsSpareHookSkills({
      ref: input.state.target,
      nots: input.state.plan.nots,
      hookCommands: await getAllRoleModHookCommands(
        { ref: input.state.target },
        context,
      ),
    });

  // a regular file in a kind dir is refused, so a swap never destroys it
  assertRoleKindDirsLinksOnly({ roleDir: input.state.roleDir });
};
