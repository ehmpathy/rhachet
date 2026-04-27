import { BadRequestError } from 'helpful-errors';

import type { RoleRegistry } from '@src/domain.objects';


import {
  type ForbiddenNpxHookViolation,
  findRolesWithForbiddenNpxHooks,
  getForbiddenNpxHint,
} from './findRolesWithForbiddenNpxHooks';

/**
 * .what = builds treestruct block for a single violation
 * .why = consistent format per hook violation
 *
 * .note = always use ├─ since fix line comes after all violations
 */
const buildViolationBlock = (
  violation: ForbiddenNpxHookViolation,
): string[] => {
  return [
    `   ├─ ${violation.roleSlug}`,
    `   │  ├─ hook: onBrain.${violation.hookType}[${violation.hookIndex}]`,
    `   │  ├─ command: ${violation.command}`,
    `   │  └─ hint: use '${getForbiddenNpxHint(violation.command)}'`,
  ];
};

/**
 * .what = validates that no hooks use forbidden npx patterns
 * .why = fail fast at repo introspect to prevent latency footgun
 *
 * .note = throws BadRequestError with treestruct if violations found
 */
export const assertRegistryHooksNoNpx = (input: {
  registry: RoleRegistry;
}): void => {
  const { registry } = input;

  // find all hooks with forbidden npx patterns
  const violations = findRolesWithForbiddenNpxHooks({ registry });

  // return early if all hooks are valid
  if (violations.length === 0) return;

  // build treestruct error message
  const violationBlocks = violations.flatMap((v) => buildViolationBlock(v));

  const message = [
    '✋ hooks with forbidden npx patterns',
    '   │',
    '   ├─ these hooks use npx which adds 500ms-2s latency per invocation:',
    '   │',
    ...violationBlocks,
    '   │',
    "   └─ fix: replace 'npx rhachet' with './node_modules/.bin/rhachet' or 'rhachet' (global)",
  ].join('\n');

  throw new BadRequestError(message, {
    violations,
  });
};
