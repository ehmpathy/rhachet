import { BadRequestError } from 'helpful-errors';

import type { RoleRegistry } from '@src/domain.objects';

import {
  findRolesWithBootableButNoHook,
  type RoleBootHookViolation,
} from './findRolesWithBootableButNoHook';

/**
 * .what = generates the 'has:' line for a violation
 * .why = lists which bootable content types are declared
 */
const getHasLine = (violation: RoleBootHookViolation): string => {
  const parts: string[] = [];
  if (violation.hasBriefsDirs) parts.push('briefs.dirs');
  if (violation.hasSkillsDirs) parts.push('skills.dirs');
  return parts.join(', ');
};

/**
 * .what = generates the hint line for a violation
 * .why = provides actionable guidance per violation type
 */
const getHintLine = (violation: RoleBootHookViolation): string => {
  switch (violation.reason) {
    case 'no-hook-declared':
      return `add hooks.onBrain.onBoot with './node_modules/.bin/rhachet roles boot --role ${violation.roleSlug}'`;
    case 'absent-roles-boot-command':
      return `hook must contain 'rhachet roles boot --role ${violation.roleSlug}'`;
    case 'wrong-role-name':
      return `fix --role flag to boot the correct role (expected: --role ${violation.roleSlug})`;
  }
};

/**
 * .what = builds treestruct block for a single violation
 * .why = consistent format per role violation
 */
const buildViolationBlock = (
  violation: RoleBootHookViolation,
  isLast: boolean,
): string[] => {
  const prefix = isLast ? '└─' : '├─';
  const continuePrefix = isLast ? '   ' : '│  ';

  return [
    `   ${prefix} ${violation.roleSlug}`,
    `   ${continuePrefix}├─ has: ${getHasLine(violation)}`,
    `   ${continuePrefix}├─ reason: ${violation.reason}`,
    `   ${continuePrefix}└─ hint: ${getHintLine(violation)}`,
  ];
};

/**
 * .what = validates that all roles with bootable content have valid boot hooks
 * .why = fail fast at repo introspect to prevent footgun where roles forget boot hooks
 *
 * .note = throws BadRequestError with treestruct if violations found
 */
export const assertRegistryBootHooksDeclared = (input: {
  registry: RoleRegistry;
}): void => {
  const { registry } = input;

  // find all roles with bootable content but no valid boot hook
  const violations = findRolesWithBootableButNoHook({ registry });

  // return early if all roles are valid
  if (violations.length === 0) return;

  // build treestruct error message
  const violationBlocks = violations.flatMap((v, i) =>
    buildViolationBlock(v, i === violations.length - 1),
  );

  const message = [
    '✋ roles with bootable content but no valid boot hook',
    '   │',
    '   ├─ these roles declare briefs or skills but lack a valid boot hook:',
    '   │',
    ...violationBlocks,
    '',
    '   ├─ why:',
    '   │  roles with briefs.dirs or skills.dirs have content to boot on session start.',
    "   │  the boot hook must run 'rhachet roles boot --role <this-role>' to load the content.",
    '   │',
    "   └─ fix: if a role doesn't need to boot, don't declare briefs.dirs or skills.dirs.",
  ].join('\n');

  throw new BadRequestError(message, {
    violations,
  });
};
