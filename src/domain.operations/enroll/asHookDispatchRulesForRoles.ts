import type { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';
import { isHookOfRepoModSweep } from '@src/domain.operations/mods/isHookOfRepoModSweep';

import { isHookAuthorOfEnrolledRoles } from './isHookAuthorOfEnrolledRoles';

/**
 * .what = the rules authored by the given enrolled roles, plus the mod-armed stop sweep
 * .why = an actor's dispatcher runs its own roles' rules alone — the narrow `getSettingsForRoles`
 *   applies to settings hooks, applied to manifest rows, through the same predicates
 *
 * .note = a mod-armed sweep rides every actor (`isHookOfRepoModSweep`): a mod fault is the repo's,
 *   so a seat that holds no `.this` role is told of it at its stop too
 */
export const asHookDispatchRulesForRoles = (input: {
  rules: HookDispatchRule[];
  roles: string[];
  isArmedByMods: boolean;
}): HookDispatchRule[] =>
  input.rules.filter(
    (rule) =>
      isHookAuthorOfEnrolledRoles({
        author: rule.author,
        roles: input.roles,
      }) === true ||
      isHookOfRepoModSweep({
        author: rule.author,
        command: rule.command,
        isArmedByMods: input.isArmedByMods,
      }),
  );
