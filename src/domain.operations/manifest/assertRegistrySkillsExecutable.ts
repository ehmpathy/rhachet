import { BadRequestError } from 'helpful-errors';

import type { RoleRegistry } from '@src/domain.objects';

import { findNonExecutableShellSkills } from './findNonExecutableShellSkills';

/**
 * .what = validates that all .sh files in skills directories are executable
 * .why = fail fast at repo introspect to prevent broken skill packages from publish
 *
 * .note = throws BadRequestError if any non-executable .sh files are found
 */
export const assertRegistrySkillsExecutable = (input: {
  registry: RoleRegistry;
}): void => {
  const { registry } = input;

  // find all non-executable .sh files
  const nonExecutablePaths = findNonExecutableShellSkills({ registry });

  // return early if all skills are executable
  if (nonExecutablePaths.length === 0) return;

  // build error message with all paths
  const pathList = nonExecutablePaths.map((p) => `  - ${p}`).join('\n');
  const message = [
    'non-executable skill files detected',
    '',
    'these .sh files in skills directories are not marked executable:',
    pathList,
    '',
    'fix: run `chmod +x <path>` for each file, or ensure git preserves execute bits',
  ].join('\n');

  throw new BadRequestError(message, {
    nonExecutablePaths,
  });
};
