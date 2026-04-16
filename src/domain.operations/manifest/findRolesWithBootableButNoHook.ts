import type { RoleRegistry } from '@src/domain.objects';

/**
 * .what = reason why a role failed boot hook validation
 * .why = enables specific error messages and hints per violation type
 */
export type BootHookViolationReason =
  | 'no-hook-declared' // hooks.onBrain.onBoot is undefined or empty
  | 'absent-roles-boot-command' // hook exists but lacks 'roles boot'
  | 'wrong-role-name'; // hook has 'roles boot' but wrong --role

/**
 * .what = describes a role that has bootable content but no valid boot hook
 * .why = enables structured error report with all relevant details
 */
export interface RoleBootHookViolation {
  roleSlug: string;
  hasBriefsDirs: boolean;
  hasSkillsDirs: boolean;
  reason: BootHookViolationReason;
}

/**
 * .what = checks if a role has bootable content declared
 * .why = determines if a role requires a boot hook
 *
 * .note = checks property presence, not array content
 *         empty briefs: { dirs: [] } still requires hook
 */
const hasBootableContent = (role: {
  briefs?: { dirs?: unknown };
  skills?: { dirs?: unknown };
}): {
  hasBriefsDirs: boolean;
  hasSkillsDirs: boolean;
  hasBootable: boolean;
} => {
  const hasBriefsDirs = role.briefs?.dirs !== undefined;
  const hasSkillsDirs = role.skills?.dirs !== undefined;
  return {
    hasBriefsDirs,
    hasSkillsDirs,
    hasBootable: hasBriefsDirs || hasSkillsDirs,
  };
};

/**
 * .what = validates that a boot hook contains the correct command for the role
 * .why = ensures hook actually boots the correct role, not just any role
 *
 * .note = valid patterns:
 *   - rhachet roles boot ... --role <slug>
 *   - rhx roles boot ... --role <slug>
 *   - order of flags does not matter
 */
const validateBootHook = (
  hooks: { onBrain?: { onBoot?: { command: string }[] } } | undefined,
  roleSlug: string,
): { valid: true } | { valid: false; reason: BootHookViolationReason } => {
  // check if onBoot hooks are declared
  const onBootHooks = hooks?.onBrain?.onBoot;
  if (!onBootHooks || onBootHooks.length === 0) {
    return { valid: false, reason: 'no-hook-declared' };
  }

  // check if any hook contains 'roles boot' command
  const hasRolesBootCommand = onBootHooks.some((hook) =>
    /\broles\s+boot\b/.test(hook.command),
  );
  if (!hasRolesBootCommand) {
    return { valid: false, reason: 'absent-roles-boot-command' };
  }

  // check if any hook boots the correct role
  const rolePattern = new RegExp(`--role\\s+${roleSlug}(?:\\s|$)`);
  const bootsCorrectRole = onBootHooks.some(
    (hook) =>
      /\broles\s+boot\b/.test(hook.command) && rolePattern.test(hook.command),
  );
  if (!bootsCorrectRole) {
    return { valid: false, reason: 'wrong-role-name' };
  }

  return { valid: true };
};

/**
 * .what = finds all roles with bootable content but no valid boot hook
 * .why = enables failfast guard in repo introspect to prevent footgun
 *
 * .note = returns empty array when all roles are valid
 */
export const findRolesWithBootableButNoHook = (input: {
  registry: RoleRegistry;
}): RoleBootHookViolation[] => {
  const { registry } = input;
  const violations: RoleBootHookViolation[] = [];

  // iterate all roles in the registry
  for (const role of registry.roles) {
    // check if role has bootable content
    const { hasBriefsDirs, hasSkillsDirs, hasBootable } =
      hasBootableContent(role);
    if (!hasBootable) continue;

    // validate boot hook
    const validation = validateBootHook(role.hooks, role.slug);
    if (validation.valid) continue;

    // collect violation
    violations.push({
      roleSlug: role.slug,
      hasBriefsDirs,
      hasSkillsDirs,
      reason: validation.reason,
    });
  }

  return violations;
};
