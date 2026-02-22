import { HelpfulError } from 'helpful-errors';
import type { z } from 'zod';

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

  /**
   * .what = the captured stderr output from the skill script
   * .why = enables callers to display the skill's error message cleanly
   */
  public readonly stderr: string | null;

  constructor(
    message: string,
    metadata: {
      skill: string;
      path: string;
      exitCode: number | null;
      stderr?: string | null;
    },
  ) {
    super(message, metadata);
    this.exitCode = metadata.exitCode ?? 1;
    this.stderr = metadata.stderr ?? null;
  }
}

/**
 * .what = executes a skill script with passthrough args
 * .why = runs the discovered skill with full arg passthrough
 *
 * .note = when stream=true (default), stdout/stderr stream progressively
 * .note = when stream=false, captures stdout and parses as JSON
 * .note = when schema.output provided, validates output against zod schema
 * .note = uses spawnSync with explicit stdin passthrough to ensure input
 *         reaches the script (Commander.js may consume stdin before execSync)
 * .note = TOutput generic enables type flow when schema provided
 */
export const executeSkill = <TOutput = unknown>(input: {
  skill: RoleSkillExecutable;
  args: string[];
  stream?: boolean;
  schema?: { output: z.ZodSchema<TOutput> };
}): TOutput => {
  const stream = input.stream ?? true;

  // build command with args
  const command = [input.skill.path, ...input.args]
    .map((arg) => (arg.includes(' ') ? `"${arg}"` : arg))
    .join(' ');

  // run skill: stream mode passes through stdin/stdout, capture mode pipes stdout
  // stderr is always buffered so we can include it in errors
  const result = spawnSync(command, [], {
    cwd: process.cwd(),
    shell: '/bin/bash',
    encoding: 'utf-8',
    stdio: stream
      ? [process.stdin, process.stdout, 'pipe']
      : ['inherit', 'pipe', 'pipe'],
  });

  // throw on non-zero exit, preserve the original exit code and captured stderr
  if (result.status !== 0)
    throw new SkillExecutionError('skill execution failed', {
      skill: input.skill.slug,
      path: input.skill.path,
      exitCode: result.status,
      stderr: result.stderr?.trim() || null,
    });

  // stream mode has no return value
  if (stream) return undefined as TOutput;

  // capture mode: parse JSON output if present
  const stdout = ((result.stdout as string) ?? '').trim();
  if (!stdout) return undefined as TOutput;

  // parse stdout as JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    parsed = stdout;
  }

  // validate against schema if provided
  if (input.schema) return input.schema.output.parse(parsed);

  return parsed as TOutput;
};
