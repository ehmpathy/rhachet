import { ConstraintError } from 'helpful-errors';

import type { RoleRegistry } from '@src/domain.objects';

import {
  findRolesWithRoleBootHooks,
  type RoleBootHookViolation,
} from './findRolesWithRoleBootHooks';

/**
 * .what = the treestruct rows for one violation
 * .note = always `├─`, since the hint line comes after every violation
 */
const asViolationLines = (violation: RoleBootHookViolation): string[] => [
  `   ├─ ${violation.roleSlug}`,
  `   │  ├─ hook: onBrain.${violation.hookType}[${violation.hookIndex}]`,
  `   │  └─ command: ${violation.command}`,
];

/**
 * .what = refuses a registry whose roles boot themselves from a hook
 * .why = briefs reach a session through the roles interface — the brain dir boot.md render.
 *        a self-boot hook is pruned from every consumer's settings at `init --hooks`, so it
 *        ships as dead weight at best, and as a double load at worst. fail at publish, where
 *        the supplier owns the fix
 *
 * .note = a `roles boot --manifest` hook is a custom payload boot.md never renders, and passes
 */
export const assertRegistryHooksNoRoleBoot = (input: {
  registry: RoleRegistry;
}): void => {
  // find each self-boot hook
  const violations = findRolesWithRoleBootHooks({ registry: input.registry });
  if (violations.length === 0) return;

  // .note = the message carries no glyph; `asCliErrorFrame` prepends one from the class
  const message = [
    'hooks that boot their own role',
    '   │',
    '   ├─ briefs reach a session via the brain dir boot.md render, so these hooks are redundant:',
    '   │',
    ...violations.flatMap(asViolationLines),
    '   │',
    '   └─ hint: delete each `roles boot --role` hook; boot.md already renders these roles',
  ].join('\n');

  throw new ConstraintError(message, { violations });
};
