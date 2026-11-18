import type { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';
import { asRoleSlugOfHookAuthor } from '@src/domain.operations/enroll/asRoleSlugOfHookAuthor';
import { asRoleFocusParts } from '@src/domain.operations/roles/focus/asRoleFocusParts';

/**
 * .what = the rules authored by the given enrolled roles
 * .why = an actor's dispatcher runs its own roles' rules alone — the narrow `getSettingsForRoles`
 *   once applied to per-rule settings hooks, now applied to manifest rows
 *
 * .note = a role is matched by its whole `role=` segment, its focus stripped first, exactly as
 *   `getSettingsForRoles` matches
 */
export const asHookDispatchRulesForRoles = (input: {
  rules: HookDispatchRule[];
  roles: string[];
}): HookDispatchRule[] => {
  const rolesEnrolled = new Set(
    input.roles.map((token) => asRoleFocusParts({ token }).role),
  );
  return input.rules.filter((rule) => {
    const role = asRoleSlugOfHookAuthor({ author: rule.author });
    return role !== null && rolesEnrolled.has(role);
  });
};
