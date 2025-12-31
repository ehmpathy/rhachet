import type { RoleSkillExecutable } from '@src/domain.objects/RoleSkillExecutable';

import { execSync } from 'node:child_process';

/**
 * .what = executes a skill script with passthrough args
 * .why = runs the discovered skill with full arg passthrough
 *
 * .note = captures stdout and parses JSON output when available
 */
export const executeSkill = (input: {
  skill: RoleSkillExecutable;
  args: string[];
}): unknown => {
  // build command with args
  const command = [input.skill.path, ...input.args]
    .map((arg) => {
      // quote args with spaces
      if (arg.includes(' ')) return `"${arg}"`;
      return arg;
    })
    .join(' ');

  // execute and capture stdout
  const stdout = execSync(command, {
    cwd: process.cwd(),
    shell: '/bin/bash',
    encoding: 'utf-8',
  });

  // parse JSON output if present
  const trimmed = stdout.trim();
  if (!trimmed) return undefined;

  try {
    return JSON.parse(trimmed);
  } catch {
    // return raw string if not valid JSON
    return trimmed;
  }
};
