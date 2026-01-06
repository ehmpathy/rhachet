import { HelpfulError } from 'helpful-errors';

import type { RoleInitExecutable } from '@src/domain.objects/RoleInitExecutable';

import { spawnSync } from 'node:child_process';

/**
 * .what = error thrown when an init script exits with non-zero status
 * .why = enables callers to catch and handle init failures gracefully
 */
export class InitExecutionError extends HelpfulError {}

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
  // build command with args
  const command = [input.init.path, ...input.args]
    .map((arg) => {
      // quote args with spaces
      if (arg.includes(' ')) return `"${arg}"`;
      return arg;
    })
    .join(' ');

  // execute with explicit stdin passthrough to ensure data reaches script
  const result = spawnSync(command, [], {
    cwd: process.cwd(),
    stdio: [process.stdin, process.stdout, process.stderr],
    shell: '/bin/bash',
  });

  // throw on non-zero exit
  if (result.status !== 0)
    throw new InitExecutionError('init execution failed', {
      init: input.init.slug,
      path: input.init.path,
    });
};
