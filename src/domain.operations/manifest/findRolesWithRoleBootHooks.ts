import type { RoleRegistry } from '@src/domain.objects';
import { isRolesBootCommand } from '@src/domain.operations/boot/isRolesBootCommand';

/**
 * .what = describes a hook that boots a role through `roles boot --role`
 * .why = enables a structured report of each hook a supplier must delete
 */
export interface RoleBootHookViolation {
  roleSlug: string;
  hookType: 'onBoot' | 'onTool' | 'onStop' | 'onTalk';
  hookIndex: number;
  command: string;
}

/**
 * .what = finds every hook that boots a role through `roles boot --role`
 * .why = a role's briefs reach a session via the brain dir boot.md render. a role that
 *        also boots itself from a hook declares a payload rhachet already delivers
 *
 * .note = a `--manifest` boot is not a role boot, and is not found here
 */
export const findRolesWithRoleBootHooks = (input: {
  registry: RoleRegistry;
}): RoleBootHookViolation[] => {
  const hookTypes = ['onBoot', 'onTool', 'onStop', 'onTalk'] as const;
  return input.registry.roles.flatMap((role) =>
    hookTypes.flatMap((hookType) =>
      (role.hooks?.onBrain?.[hookType] ?? []).flatMap((hook, hookIndex) =>
        isRolesBootCommand({ command: hook.command })
          ? [
              {
                roleSlug: role.slug,
                hookType,
                hookIndex,
                command: hook.command,
              },
            ]
          : [],
      ),
    ),
  );
};
