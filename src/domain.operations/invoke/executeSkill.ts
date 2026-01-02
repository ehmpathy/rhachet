import type { RoleSkillExecutable } from '@src/domain.objects/RoleSkillExecutable';

import { execSync, spawnSync } from 'node:child_process';

/**
 * .what = executes a skill script with passthrough args
 * .why = runs the discovered skill with full arg passthrough
 *
 * .note = when stream=true (default), stdout/stderr stream progressively
 * .note = when stream=false, captures stdout and parses as JSON
 * .note = uses spawnSync with explicit stdin passthrough to ensure input
 *         reaches the script (Commander.js may consume stdin before execSync)
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

  // stream mode: use spawnSync with explicit stdin passthrough
  if (stream) {
    const result = spawnSync(command, [], {
      cwd: process.cwd(),
      shell: '/bin/bash',
      stdio: [process.stdin, process.stdout, process.stderr],
    });

    // propagate non-zero exit codes
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }

    return undefined;
  }

  // capture mode: capture stdout for JSON parse
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
