import { HelpfulError } from 'helpful-errors';

import type { RoleSkillExecutable } from '@src/domain.objects/RoleSkillExecutable';

import { spawnSync } from 'node:child_process';

/**
 * .what = error thrown when a skill script exits with non-zero status
 * .why = enables callers to catch and handle skill failures gracefully
 */
export class SkillExecutionError extends HelpfulError {
  /**
   * .what = the exit code from the skill script
   * .why = enables callers to forward the original exit code to process.exit()
   */
  public readonly exitCode: number;

  constructor(
    message: string,
    metadata: { skill: string; path: string; exitCode: number | null },
  ) {
    super(message, metadata);
    this.exitCode = metadata.exitCode ?? 1;
  }
}

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
  const stream = input.stream ?? true;

  // build command with args
  const command = [input.skill.path, ...input.args]
    .map((arg) => (arg.includes(' ') ? `"${arg}"` : arg))
    .join(' ');

  // run skill: stream mode passes through stdio, capture mode pipes stdout
  const result = spawnSync(command, [], {
    cwd: process.cwd(),
    shell: '/bin/bash',
    encoding: 'utf-8',
    stdio: stream
      ? [process.stdin, process.stdout, process.stderr]
      : ['inherit', 'pipe', 'inherit'],
  });

  // throw on non-zero exit, preserve the original exit code
  if (result.status !== 0)
    throw new SkillExecutionError('skill execution failed', {
      skill: input.skill.slug,
      path: input.skill.path,
      exitCode: result.status,
    });

  // stream mode has no return value
  if (stream) return undefined;

  // capture mode: parse JSON output if present
  const stdout = ((result.stdout as string) ?? '').trim();
  if (!stdout) return undefined;

  try {
    return JSON.parse(stdout);
  } catch {
    return stdout;
  }
};
