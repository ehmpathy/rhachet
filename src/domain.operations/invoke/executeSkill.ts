import type { RoleSkillExecutable } from '@src/domain.objects/RoleSkillExecutable';

import { execSync } from 'node:child_process';

/**
 * .what = executes a skill script with passthrough args
 * .why = runs the discovered skill with full arg passthrough
 *
 * .note = when stream=true (default), streams stdout/stderr progressively
 * .note = when stream=false, captures stdout and parses JSON output
 */
export const executeSkill = (input: {
  skill: RoleSkillExecutable;
  args: string[];
  stream?: boolean;
}): unknown => {
  // default to streaming (backwards compatible with CLI behavior)
  const stream = input.stream ?? true;

  // build command with args
  const command = [input.skill.path, ...input.args]
    .map((arg) => {
      // quote args with spaces
      if (arg.includes(' ')) return `"${arg}"`;
      return arg;
    })
    .join(' ');

  // streaming mode: inherit stdio for progressive output
  if (stream) {
    execSync(command, {
      cwd: process.cwd(),
      shell: '/bin/bash',
      stdio: 'inherit',
    });
    return undefined;
  }

  // capture mode: capture stdout for JSON parsing
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
