import type { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';

import { isHookAuthorOfEnrolledRoles } from './isHookAuthorOfEnrolledRoles';

/**
 * .what = the rules authored by the given enrolled roles
 * .why = an actor's dispatcher runs its own roles' rules alone — the narrow `getSettingsForRoles`
 *   applies to settings hooks, applied to manifest rows, through the same predicate
 */
export const asHookDispatchRulesForRoles = (input: {
  rules: HookDispatchRule[];
  roles: string[];
}): HookDispatchRule[] =>
  input.rules.filter(
    (rule) =>
      isHookAuthorOfEnrolledRoles({
        author: rule.author,
        roles: input.roles,
      }) === true,
  );
