import type { RoleRegistry } from '@src/domain.objects';

/**
 * .what = describes a hook that uses a forbidden npx pattern
 * .why = enables structured error report with all relevant details
 */
export interface ForbiddenNpxHookViolation {
  roleSlug: string;
  hookType: 'onBoot' | 'onTool' | 'onStop' | 'onTalk';
  hookIndex: number;
  command: string;
}

/**
 * .what = pattern to detect forbidden npx usage
 * .why = npx tries to auto-install packages — adds 500ms-2s latency
 *
 * .note = pnpm exec, yarn exec, and bunx are fine — they only run what's installed
 */
const FORBIDDEN_PATTERN = /\bnpx\b.*?\b(rhachet|rhx)\b/;

/**
 * .what = generates the suggested fix for a forbidden command
 * .why = replace npx with direct path
 */
export const getForbiddenNpxHint = (command: string): string => {
  // extract the command after npx rhachet|rhx
  const match = command.match(
    /\bnpx\b\s+(?:--\S+\s+)*(\brhachet\b|\brhx\b)\s+(.*)/,
  );
  if (!match)
    return command.replace(/\bnpx\b/, './node_modules/.bin/rhachet');

  const [, , rest] = match;
  // always use rhachet (rhx is just an alias)
  return `./node_modules/.bin/rhachet ${rest}`.trim();
};

/**
 * .what = checks if a command uses a forbidden npx pattern
 * .why = enable detection of latency-causing patterns
 */
const isForbiddenCommand = (command: string): boolean => {
  return FORBIDDEN_PATTERN.test(command);
};

/**
 * .what = finds all hooks that use forbidden npx patterns
 * .why = enables failfast guard in repo introspect to prevent latency footgun
 *
 * .note = returns empty array when all hooks are valid
 */
export const findRolesWithForbiddenNpxHooks = (input: {
  registry: RoleRegistry;
}): ForbiddenNpxHookViolation[] => {
  const { registry } = input;
  const violations: ForbiddenNpxHookViolation[] = [];

  const hookTypes = ['onBoot', 'onTool', 'onStop', 'onTalk'] as const;

  // iterate all roles in the registry
  for (const role of registry.roles) {
    const hooks = role.hooks?.onBrain;
    if (!hooks) continue;

    // check each hook type
    for (const hookType of hookTypes) {
      const hooksOfType = hooks[hookType];
      if (!hooksOfType) continue;

      // check each hook command
      for (let i = 0; i < hooksOfType.length; i++) {
        const hook = hooksOfType[i];
        if (!hook || !isForbiddenCommand(hook.command)) continue;

        violations.push({
          roleSlug: role.slug,
          hookType,
          hookIndex: i,
          command: hook.command,
        });
      }
    }
  }

  return violations;
};
