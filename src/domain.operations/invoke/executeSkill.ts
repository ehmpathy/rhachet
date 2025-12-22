import type { RoleSkillExecutable } from '@src/domain.objects/RoleSkillExecutable';

import { execSync } from 'node:child_process';

/**
 * .what = executes a skill script with passthrough args
 * .why = runs the discovered skill with full arg passthrough
 */
export const executeSkill = (input: {
  skill: RoleSkillExecutable;
  args: string[];
}): void => {
  // build command with args
  const command = [input.skill.path, ...input.args]
    .map((arg) => {
      // quote args with spaces
      if (arg.includes(' ')) return `"${arg}"`;
      return arg;
    })
    .join(' ');

  // execute with inherited stdio
  execSync(command, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: '/bin/bash',
  });
};
