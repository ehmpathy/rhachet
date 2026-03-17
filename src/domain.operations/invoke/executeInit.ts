import { HelpfulError } from 'helpful-errors';

import type { RoleInitExecutable } from '@src/domain.objects/RoleInitExecutable';

import { spawnSync } from 'node:child_process';

/**
 * .what = error thrown when an init script exits with non-zero status
 * .why = enables callers to catch and handle init failures gracefully
 */
export class InitExecutionError extends HelpfulError {
  /**
   * .what = the exit code from the init script
   * .why = enables callers to forward the original exit code to process.exit()
   */
  public readonly exitCode: number;

  /**
   * .what = the captured stderr output from the init script
   * .why = enables callers to display the init's error message cleanly
   */
  public readonly stderr: string | null;

  constructor(
    message: string,
    metadata: {
      init: string;
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
 * .what = executes an init script with passthrough args
 * .why = runs the discovered init with full arg passthrough
 *
 * .note = uses spawnSync with explicit stdin passthrough to ensure input
 *         reaches the script (Commander.js may consume stdin before execSync)
 */
export const executeInit = (input: {
  init: RoleInitExecutable;
  args: string[];
}): void => {
  // build command with args, quote any that contain shell metacharacters
  // use single quotes to prevent all shell interpretation
  // escape embedded single quotes: ' → '\''
  const command = [input.init.path, ...input.args]
    .map((arg) => {
      // safe chars: alphanumerics, underscore, hyphen, dot, forward slash, colon, at, equals
      if (/^[a-zA-Z0-9_\-./:@=]+$/.test(arg)) return arg;
      // wrap in single quotes, escape any embedded single quotes
      return `'${arg.replace(/'/g, "'\\''")}'`;
    })
    .join(' ');

  // execute with explicit stdin passthrough to ensure data reaches init
  // stderr is always buffered so we can include it in errors
  const result = spawnSync(command, [], {
    cwd: process.cwd(),
    stdio: [process.stdin, process.stdout, 'pipe'],
    shell: '/bin/bash',
    encoding: 'utf-8',
  });

  // throw on non-zero exit, preserve the original exit code and captured stderr
  if (result.status !== 0)
    throw new InitExecutionError('init execution failed', {
      init: input.init.slug,
      path: input.init.path,
      exitCode: result.status,
      stderr: result.stderr?.trim() || null,
    });
};
